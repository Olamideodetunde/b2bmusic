-- Upgrades a `tracks` table created by the original frontend bundle's schema.sql
-- (agency_price_cents, jsonb tag columns, sync_meta defaulting to '{}') to the
-- current schema, in place: every row, id and slug (live URL) is preserved.
--
-- On a database created fresh by 001_init.sql this is a no-op.

-- jsonb array → text[] (ALTER … USING can't contain a subquery, so use a helper)
CREATE OR REPLACE FUNCTION pg_temp.jsonb_to_text_array(j jsonb) RETURNS text[]
  LANGUAGE sql IMMUTABLE AS
  $$ SELECT COALESCE(array_agg(x), '{}') FROM jsonb_array_elements_text(COALESCE(j, '[]'::jsonb)) AS x $$;

DO $$
DECLARE
  moods_type text;
  use_cases_type text;
BEGIN
  -- 1. Price column renamed to match the sheet ("Commercial Price")
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'tracks' AND column_name = 'agency_price_cents') THEN
    ALTER TABLE tracks RENAME COLUMN agency_price_cents TO commercial_price_cents;
  END IF;

  -- 2. Tag columns: jsonb → text[]  (the GIN index from 001 must be rebuilt for the new type)
  SELECT data_type INTO moods_type FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'tracks' AND column_name = 'moods';
  SELECT data_type INTO use_cases_type FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'tracks' AND column_name = 'use_cases';

  IF moods_type = 'jsonb' OR use_cases_type = 'jsonb' THEN
    DROP INDEX IF EXISTS tracks_use_cases_idx;
  END IF;
  IF moods_type = 'jsonb' THEN
    ALTER TABLE tracks ALTER COLUMN moods DROP DEFAULT;
    ALTER TABLE tracks ALTER COLUMN moods TYPE text[] USING pg_temp.jsonb_to_text_array(moods);
  END IF;
  IF use_cases_type = 'jsonb' THEN
    ALTER TABLE tracks ALTER COLUMN use_cases DROP DEFAULT;
    ALTER TABLE tracks ALTER COLUMN use_cases TYPE text[] USING pg_temp.jsonb_to_text_array(use_cases);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tracks_use_cases_idx ON tracks USING GIN (use_cases);

-- 3. Tag defaults / NOT NULL
UPDATE tracks SET moods = '{}' WHERE moods IS NULL;
UPDATE tracks SET use_cases = '{}' WHERE use_cases IS NULL;
ALTER TABLE tracks ALTER COLUMN moods SET DEFAULT '{}', ALTER COLUMN moods SET NOT NULL;
ALTER TABLE tracks ALTER COLUMN use_cases SET DEFAULT '{}', ALTER COLUMN use_cases SET NOT NULL;

-- 4. Enrichment columns: '[]' defaults; sync_meta NULL when absent (legacy '{}' meant "none")
UPDATE tracks SET alt_mixes = '[]'::jsonb WHERE alt_mixes IS NULL;
UPDATE tracks SET stems = '[]'::jsonb WHERE stems IS NULL;
ALTER TABLE tracks ALTER COLUMN alt_mixes SET DEFAULT '[]'::jsonb, ALTER COLUMN alt_mixes SET NOT NULL;
ALTER TABLE tracks ALTER COLUMN stems SET DEFAULT '[]'::jsonb, ALTER COLUMN stems SET NOT NULL;
UPDATE tracks SET sync_meta = NULL WHERE sync_meta = '{}'::jsonb;
ALTER TABLE tracks ALTER COLUMN sync_meta DROP DEFAULT;

-- 5. Columns added after the legacy schema
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS vocal_type TEXT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
UPDATE tracks SET created_at = COALESCE(published_at, now()) WHERE created_at IS NULL;
ALTER TABLE tracks ALTER COLUMN created_at SET DEFAULT now(), ALTER COLUMN created_at SET NOT NULL;

-- 6. Status / timestamps must never be NULL (the legacy schema allowed it)
UPDATE tracks SET is_published = TRUE WHERE is_published IS NULL;
UPDATE tracks SET published_at = now() WHERE published_at IS NULL;
UPDATE tracks SET updated_at = published_at WHERE updated_at IS NULL;
ALTER TABLE tracks ALTER COLUMN is_published SET NOT NULL;
ALTER TABLE tracks ALTER COLUMN published_at SET NOT NULL;
ALTER TABLE tracks ALTER COLUMN updated_at SET NOT NULL;

-- 7. The legacy idx_tracks_slug duplicates the UNIQUE constraint's index
DROP INDEX IF EXISTS idx_tracks_slug;
