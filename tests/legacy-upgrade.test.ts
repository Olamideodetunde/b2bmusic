import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { runMigrations } from '../src/lib/db/migrate';
import { PostgresRepository } from '../src/lib/db/postgres';
import { publishTrack } from '../src/lib/ingest/service';
import { okFetch, sampleRows } from './helpers';

/**
 * Reproduces the production Neon database as found on 2026-09-29: a `tracks` table
 * created by the original bundle's schema.sql, with live rows. Migrations must upgrade
 * it in place — keeping ids and slugs (live URLs) — and the app must then work on it.
 */
const LEGACY_SCHEMA = `
CREATE TABLE tracks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  target_keyword VARCHAR(255) NOT NULL,
  bpm INTEGER NOT NULL,
  musical_key VARCHAR(50) NOT NULL,
  genre VARCHAR(100) NOT NULL,
  moods JSONB DEFAULT '[]'::jsonb,
  use_cases JSONB DEFAULT '[]'::jsonb,
  description TEXT NOT NULL,
  preview_audio_url TEXT NOT NULL,
  full_audio_url TEXT,
  cover_image_url TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 120,
  standard_price_cents INTEGER NOT NULL DEFAULT 1000,
  agency_price_cents INTEGER NOT NULL DEFAULT 2000,
  broadcast_price_cents INTEGER NOT NULL DEFAULT 4000,
  stripe_product_id VARCHAR(255),
  alt_mixes JSONB DEFAULT '[]'::jsonb,
  stems JSONB DEFAULT '[]'::jsonb,
  sync_meta JSONB DEFAULT '{}'::jsonb,
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tracks_slug ON tracks(slug);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_bpm ON tracks(bpm);
CREATE INDEX IF NOT EXISTS idx_tracks_published ON tracks(is_published);

INSERT INTO tracks (id, title, slug, target_keyword, bpm, musical_key, genre, moods, use_cases, description, preview_audio_url, standard_price_cents, agency_price_cents, broadcast_price_cents)
VALUES
 (1, 'Aura of Silicon', 'corporate-tech-innovation-background-music', 'corporate tech innovation background music', 122, 'D Major', 'Tech Ambient',
  '["Visionary","Focused"]', '["SaaS Product Reveal","Keynote Presentation"]', 'Legacy description one, long enough to be realistic for a production music track.', 'https://cdn.example.com/1.mp3', 1000, 2000, 4000),
 (10, 'Legacy Enriched Track', 'futuristic-tech-product-announcement-music', 'futuristic tech product announcement music', 126, 'E Minor', 'Tech Electronic',
  '["Futuristic"]', '["Product Launch"]', 'Legacy description two, long enough to be realistic for a production music track.', 'https://cdn.example.com/10.mp3', 4900, 2000, 19900);
UPDATE tracks SET stems = '[{"name":"Drums.wav","category":"Drums","format":"WAV 24-bit / 48kHz"}]', sync_meta = '{"composer":"A. Composer","isrc":"US-X-1"}' WHERE id = 10;
SELECT setval('tracks_id_seq', 10);
`;

test('legacy production schema is upgraded in place and stays usable', async () => {
  const db = new PGlite();
  await db.exec(LEGACY_SCHEMA);
  const target = { exec: (sql: string) => db.exec(sql), query: (t: string, p?: unknown[]) => db.query(t, p as any[]) as any };

  const applied = await runMigrations(target);
  assert.deepEqual(applied, ['001_init.sql', '002_upgrade_legacy_tracks.sql', '003_legacy_data_cleanup.sql']);
  assert.deepEqual(await runMigrations(target), [], 'second run is a no-op');

  const repo = new PostgresRepository(target);

  // Existing rows survive with ids and slugs (live URLs) intact.
  const aura = await repo.findBySlug('corporate-tech-innovation-background-music');
  assert.equal(aura?.id, 1);
  assert.deepEqual(aura?.moods, ['Visionary', 'Focused']);            // jsonb → text[]
  assert.deepEqual(aura?.useCases, ['SaaS Product Reveal', 'Keynote Presentation']);
  assert.equal(aura?.commercialPriceCents, 2000);                      // agency → commercial
  assert.equal(aura?.syncMeta, undefined, "legacy '{}' sync_meta means none");
  assert.deepEqual(aura?.stems, []);

  const quantum = await repo.findById(10);
  assert.equal(quantum?.syncMeta?.composer, 'A. Composer');            // real metadata kept
  assert.equal(quantum?.stems.length, 1);
  assert.equal(quantum?.title, 'Legacy Enriched Track', '003 only deletes when id AND title match');
  assert.equal(aura?.genre, 'Corporate / Tech', '003 remaps legacy genres onto the dropdown');

  // New publishes work on the upgraded table and don't collide with legacy ids.
  const [row] = await sampleRows();
  const created = await publishTrack(repo, row, { fetchImpl: okFetch });
  assert.ok(created.ok, created.ok ? '' : created.errorSummary);
  assert.equal(created.trackId, 11);

  // A legacy row can be edited through the sheet flow (needs a dropdown genre).
  const edited = await publishTrack(repo, {
    'Track ID': '1', Title: 'Aura of Silicon', 'Target Keyword': 'corporate tech innovation background music',
    Genre: 'Corporate / Tech', BPM: 122, 'Musical Key': 'D Major', Duration: '2:45',
    Description: 'Legacy description one, long enough to be realistic for a production music track.',
    Moods: 'Visionary, Focused', 'Use Cases': 'SaaS Product Reveal', 'Audio URL': 'https://cdn.example.com/1.mp3',
    'Standard Price': 10, 'Commercial Price': 20, 'Broadcast Price': 40,
  }, { fetchImpl: okFetch });
  assert.ok(edited.ok, edited.ok ? '' : edited.errorSummary);
  assert.equal(edited.slug, 'corporate-tech-innovation-background-music');

  assert.equal((await repo.listPublished()).length, 3);
  await db.close();
});
