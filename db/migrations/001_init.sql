-- B2BProductionMusic.com — initial schema (Neon / any Postgres 14+)
-- Applied by `npm run db:migrate`, which records each file in schema_migrations.

-- ─── Tracks: one row per landing page ───────────────────────────────
-- Columns marked [sheet] map 1:1 to the Google Sheet "Track Index" tab.
CREATE TABLE IF NOT EXISTS tracks (
  id                     SERIAL PRIMARY KEY,                -- [sheet] Track ID (Q)
  slug                   TEXT NOT NULL UNIQUE,              -- derived from target_keyword; never changes after publish
  title                  TEXT NOT NULL,                     -- [sheet] A
  target_keyword         TEXT NOT NULL,                     -- [sheet] B
  genre                  TEXT NOT NULL,                     -- [sheet] C (validated against the dropdown list)
  bpm                    INTEGER NOT NULL CHECK (bpm BETWEEN 40 AND 250),              -- [sheet] D
  musical_key            TEXT NOT NULL,                     -- [sheet] E
  duration_seconds       INTEGER NOT NULL CHECK (duration_seconds BETWEEN 1 AND 3600), -- [sheet] F
  description            TEXT NOT NULL,                     -- [sheet] G
  moods                  TEXT[] NOT NULL DEFAULT '{}',      -- [sheet] H
  use_cases              TEXT[] NOT NULL DEFAULT '{}',      -- [sheet] I
  preview_audio_url      TEXT NOT NULL,                     -- [sheet] J
  cover_image_url        TEXT,                              -- [sheet] K
  standard_price_cents   INTEGER NOT NULL CHECK (standard_price_cents > 0),   -- [sheet] L
  commercial_price_cents INTEGER NOT NULL CHECK (commercial_price_cents > 0), -- [sheet] M
  broadcast_price_cents  INTEGER NOT NULL CHECK (broadcast_price_cents > 0),  -- [sheet] N

  -- Optional enrichment (not in the sheet)
  full_audio_url         TEXT,
  vocal_type             TEXT CHECK (vocal_type IN ('instrumental', 'female', 'male')),
  stripe_product_id      TEXT,
  alt_mixes              JSONB NOT NULL DEFAULT '[]'::jsonb,
  stems                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  sync_meta              JSONB,

  is_published           BOOLEAN NOT NULL DEFAULT TRUE,
  published_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tracks_published_idx ON tracks (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS tracks_genre_idx     ON tracks (genre) WHERE is_published;
CREATE INDEX IF NOT EXISTS tracks_bpm_idx       ON tracks (bpm) WHERE is_published;
CREATE INDEX IF NOT EXISTS tracks_use_cases_idx ON tracks USING GIN (use_cases);
-- Duplicate detection for create requests that arrive without a Track ID (e.g. a Make.com retry)
CREATE INDEX IF NOT EXISTS tracks_keyword_title_idx ON tracks (lower(target_keyword), lower(title));
-- Duplicate-description check (thin / doorway-page protection)
CREATE INDEX IF NOT EXISTS tracks_description_md5_idx ON tracks (md5(description));

-- ─── Publish log: every API call, for monitoring and debugging ──────
CREATE TABLE IF NOT EXISTS publish_events (
  id         SERIAL PRIMARY KEY,
  track_id   INTEGER REFERENCES tracks(id) ON DELETE SET NULL,
  action     TEXT NOT NULL CHECK (action IN ('created', 'updated', 'rejected', 'revalidated')),
  ok         BOOLEAN NOT NULL,
  message    TEXT NOT NULL DEFAULT '',
  payload    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS publish_events_created_idx ON publish_events (created_at DESC);

-- ─── Orders: written by the Stripe webhook ──────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                SERIAL PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,                   -- makes webhook retries idempotent
  track_id          INTEGER NOT NULL REFERENCES tracks(id),
  tier              TEXT NOT NULL CHECK (tier IN ('standard', 'commercial', 'broadcast')),
  amount_cents      INTEGER NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'usd',
  customer_email    TEXT,
  status            TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'refunded')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_track_idx ON orders (track_id);
