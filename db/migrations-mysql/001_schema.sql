-- B2BProductionMusic.com — MySQL / MariaDB schema.
-- Same tables and columns as the Postgres migrations (db/migrations/001–004), for hosts that
-- only offer MySQL (e.g. cPanel shared hosting). Applied by `npm run db:migrate` when
-- DATABASE_URL starts with mysql://, which records each file in schema_migrations.
--
-- Portable to MySQL 5.7+/8.x and MariaDB 10.3+:
--   * TEXT[] arrays and JSONB are JSON columns; booleans are TINYINT(1).
--   * Timestamps are DATETIME(3) in UTC (the app sets the session time zone to +00:00).
--   * No defaults on JSON/TEXT columns (MySQL 5.7 rejects them) — the app always writes them.
--   * Indexed strings are VARCHAR(191) so they fit utf8mb4 index limits on older servers.
--   * utf8mb4_unicode_ci compares case-insensitively, so the UNIQUE email index matches
--     Postgres's unique lower(email); emails are also stored lower-cased.
-- Each statement must end with ";" at the end of a line (the runner splits on that).

CREATE TABLE IF NOT EXISTS tracks (
  id                     INT NOT NULL AUTO_INCREMENT,
  slug                   VARCHAR(191) NOT NULL,
  title                  VARCHAR(255) NOT NULL,
  target_keyword         VARCHAR(255) NOT NULL,
  genre                  VARCHAR(100) NOT NULL,
  bpm                    INT NOT NULL CHECK (bpm BETWEEN 40 AND 250),
  musical_key            VARCHAR(50) NOT NULL,
  duration_seconds       INT NOT NULL CHECK (duration_seconds BETWEEN 1 AND 3600),
  description            TEXT NOT NULL,
  moods                  JSON NOT NULL,
  use_cases              JSON NOT NULL,
  preview_audio_url      VARCHAR(2048) NOT NULL,
  cover_image_url        VARCHAR(2048) NULL,
  standard_price_cents   INT NOT NULL CHECK (standard_price_cents > 0),
  commercial_price_cents INT NOT NULL CHECK (commercial_price_cents > 0),
  broadcast_price_cents  INT NOT NULL CHECK (broadcast_price_cents > 0),
  full_audio_url         VARCHAR(2048) NULL,
  master_wav_key         VARCHAR(1024) NULL,
  master_aiff_key        VARCHAR(1024) NULL,
  vocal_type             VARCHAR(20) NULL CHECK (vocal_type IN ('instrumental', 'female', 'male')),
  stripe_product_id      VARCHAR(191) NULL,
  alt_mixes              JSON NOT NULL,
  stems                  JSON NOT NULL,
  sync_meta              JSON NULL,
  is_published           TINYINT(1) NOT NULL DEFAULT 1,
  published_at           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY tracks_slug_unique (slug),
  KEY tracks_published_idx (is_published, published_at),
  KEY tracks_genre_idx (genre),
  KEY tracks_bpm_idx (bpm),
  KEY tracks_keyword_title_idx (target_keyword(191), title(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publish_events (
  id         INT NOT NULL AUTO_INCREMENT,
  track_id   INT NULL,
  action     VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'rejected', 'revalidated')),
  ok         TINYINT(1) NOT NULL,
  message    TEXT NOT NULL,
  payload    JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY publish_events_created_idx (created_at),
  CONSTRAINT publish_events_track_fk FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id                INT NOT NULL AUTO_INCREMENT,
  stripe_session_id VARCHAR(191) NOT NULL,
  track_id          INT NOT NULL,
  tier              VARCHAR(20) NOT NULL CHECK (tier IN ('standard', 'commercial', 'broadcast')),
  amount_cents      INT NOT NULL,
  currency          VARCHAR(10) NOT NULL DEFAULT 'usd',
  customer_email    VARCHAR(191) NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'refunded')),
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY orders_session_unique (stripe_session_id),
  KEY orders_track_idx (track_id),
  KEY orders_email_idx (customer_email, status),
  CONSTRAINT orders_track_fk FOREIGN KEY (track_id) REFERENCES tracks (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id                 INT NOT NULL AUTO_INCREMENT,
  email              VARCHAR(191) NOT NULL,
  stripe_customer_id VARCHAR(191) NULL,
  created_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_login_at      DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email),
  UNIQUE KEY users_stripe_customer_unique (stripe_customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
  stripe_subscription_id VARCHAR(191) NOT NULL,
  user_id                INT NOT NULL,
  status                 VARCHAR(40) NOT NULL,
  price_id               VARCHAR(191) NULL,
  current_period_end     DATETIME(3) NULL,
  cancel_at_period_end   TINYINT(1) NOT NULL DEFAULT 0,
  updated_at             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (stripe_subscription_id),
  KEY subscriptions_user_idx (user_id),
  CONSTRAINT subscriptions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash VARCHAR(128) NOT NULL,
  email      VARCHAR(191) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at    DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (token_hash),
  KEY login_tokens_email_idx (email, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS downloads (
  id         INT NOT NULL AUTO_INCREMENT,
  user_id    INT NULL,
  email      VARCHAR(191) NULL,
  track_id   INT NULL,
  format     VARCHAR(10) NOT NULL CHECK (format IN ('wav', 'aiff')),
  via        VARCHAR(20) NOT NULL CHECK (via IN ('subscription', 'purchase', 'receipt')),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY downloads_user_idx (user_id, created_at),
  CONSTRAINT downloads_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT downloads_track_fk FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
