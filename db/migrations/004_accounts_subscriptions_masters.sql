-- Accounts, subscriptions and protected master files.
--
-- Masters (full-quality WAV/AIFF) live in a PRIVATE object-storage bucket (S3 / Backblaze B2).
-- The database stores only their object keys — never a public URL — and files are served
-- through /api/download, which checks the buyer's subscription or purchase first.

ALTER TABLE tracks ADD COLUMN IF NOT EXISTS master_wav_key  TEXT;  -- [sheet] Master WAV
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS master_aiff_key TEXT;  -- [sheet] Master AIFF

-- ─── Users: identified by email (magic-link sign-in, no passwords) ──
CREATE TABLE IF NOT EXISTS users (
  id                 SERIAL PRIMARY KEY,
  email              TEXT NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at      TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (lower(email));

-- ─── Subscriptions: mirrored from Stripe by the webhook ─────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  stripe_subscription_id TEXT PRIMARY KEY,
  user_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status                 TEXT NOT NULL,          -- Stripe status: active, trialing, past_due, canceled, …
  price_id               TEXT,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions (user_id);

-- ─── Magic-link tokens: only a SHA-256 hash is stored; single use ────
CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_tokens_email_idx ON login_tokens (lower(email), created_at DESC);

-- ─── Download log: audit trail + fair-use limit for subscribers ─────
CREATE TABLE IF NOT EXISTS downloads (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email      TEXT,
  track_id   INTEGER REFERENCES tracks(id) ON DELETE SET NULL,
  format     TEXT NOT NULL CHECK (format IN ('wav', 'aiff')),
  via        TEXT NOT NULL CHECK (via IN ('subscription', 'purchase', 'receipt')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS downloads_user_idx ON downloads (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (lower(customer_email)) WHERE status = 'paid';
