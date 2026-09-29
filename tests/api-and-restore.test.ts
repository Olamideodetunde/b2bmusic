import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { requireApiKey, readJsonBody } from '../src/lib/api/auth';
import { restoreTable, type BackupFile } from '../src/lib/db/restore';
import { hubSummary, isHubIndexable, breadcrumbSchema, MIN_INDEXABLE_HUB_TRACKS } from '../src/lib/seo/hubs';
import { canOptimize } from '../src/lib/images';
import type { Track } from '../src/lib/db/types';

const KEY = 'k'.repeat(32);
const req = (headers: Record<string, string> = {}, body = '') =>
  new Request('http://localhost/api/tracks', { method: 'POST', headers, body: body || undefined });

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const saved = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  return Promise.resolve(fn()).finally(() => {
    for (const [k, v] of Object.entries(saved)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  });
}

test('API auth fails closed when no key is configured', () =>
  withEnv({ INGESTION_API_KEY: undefined, INGEST_API_KEY: undefined }, () => {
    assert.equal(requireApiKey(req({ authorization: `Bearer ${KEY}` }))?.status, 503);
  }));

test('API auth rejects a wrong or missing key and accepts Bearer or x-api-key', () =>
  withEnv({ INGESTION_API_KEY: KEY, INGEST_API_KEY: undefined }, () => {
    assert.equal(requireApiKey(req())?.status, 401);
    assert.equal(requireApiKey(req({ authorization: 'Bearer nope' }))?.status, 401);
    assert.equal(requireApiKey(req({ authorization: `Bearer ${KEY}` })), null);
    assert.equal(requireApiKey(req({ 'x-api-key': KEY })), null);
  }));

test('the revalidation secret only unlocks /api/revalidate', () =>
  withEnv({ INGESTION_API_KEY: KEY, REVALIDATION_SECRET: 'r'.repeat(32) }, () => {
    const h = { authorization: `Bearer ${'r'.repeat(32)}` };
    assert.equal(requireApiKey(req(h), 'revalidate'), null);
    assert.equal(requireApiKey(req(h), 'ingest')?.status, 401);
  }));

test('readJsonBody rejects invalid JSON and oversized payloads', async () => {
  const bad = await readJsonBody(req({}, '{nope'));
  assert.ok('error' in bad && bad.error.status === 400);
  const big = await readJsonBody(req({}, JSON.stringify({ d: 'x'.repeat(300 * 1024) })));
  assert.ok('error' in big && big.error.status === 413);
});

test('backup restore loads rows into a new table and never overwrites one', async () => {
  const db = new PGlite();
  const target = { exec: (sql: string) => db.exec(sql), query: (text: string, params?: unknown[]) => db.query(text, params as any[]) as any };
  const backup: BackupFile = {
    takenAt: '2026-09-29T12:28:17.477Z',
    tables: {
      tracks: {
        columns: [
          { column_name: 'id', data_type: 'integer' },
          { column_name: 'title', data_type: 'character varying' },
          { column_name: 'moods', data_type: 'jsonb' },
          { column_name: 'is_published', data_type: 'boolean' },
          { column_name: 'updated_at', data_type: 'timestamp with time zone' },
        ],
        rows: [
          { id: 1, title: "It's \"quoted\"", moods: ['Warm', 'Epic'], is_published: true, updated_at: '2026-09-01T00:00:00Z' },
          { id: 2, title: 'Second', moods: [], is_published: false, updated_at: '2026-09-02T00:00:00Z' },
        ],
      },
    },
  };
  assert.equal(await restoreTable(target, backup, 'tracks', 'tracks_restored'), 2);
  const { rows } = await db.query<{ title: string; moods: string[] }>('SELECT title, moods FROM tracks_restored ORDER BY id');
  assert.equal(rows[0].title, "It's \"quoted\"");
  assert.deepEqual(rows[0].moods, ['Warm', 'Epic']);
  await assert.rejects(restoreTable(target, backup, 'tracks', 'tracks_restored'), /already exists/);
  await assert.rejects(restoreTable(target, backup, 'tracks', 'bad; DROP TABLE x'), /Unsafe SQL identifier/);
  await db.close();
});

const track = (over: Partial<Track>): Track =>
  ({ id: 1, title: 'T', slug: 't', bpm: 100, genre: 'Cinematic', moods: [], useCases: [], ...over }) as Track;

test('hub copy is written from the tracks, so hubs never share a description', () => {
  const a = hubSummary([track({ bpm: 90, moods: ['Epic'], useCases: ['Trailer'] }), track({ bpm: 120, genre: 'Ambient', moods: ['Epic', 'Calm'] })]);
  assert.equal(a, '2 pre-cleared tracks at 90–120 BPM in Ambient and Cinematic. Mood: epic, calm. Built for Trailer.');
  const b = hubSummary([track({ bpm: 128, moods: ['Driving'] })], { omit: 'genre' });
  assert.equal(b, '1 pre-cleared track at 128 BPM. Mood: driving.');
  assert.notEqual(a, b);
});

test('single-track hubs are thin (noindex) until a second track joins', () => {
  assert.equal(MIN_INDEXABLE_HUB_TRACKS, 2);
  assert.equal(isHubIndexable(1), false);
  assert.equal(isHubIndexable(2), true);
});

test('breadcrumb schema mirrors the visible trail with absolute URLs', () => {
  const s = breadcrumbSchema('https://x.com', [{ href: '/', label: 'Home' }, { href: '/genres', label: 'Genres' }, { label: 'Ambient' }], 'https://x.com/genres/ambient');
  assert.deepEqual(s.itemListElement.map(i => i.item), ['https://x.com', 'https://x.com/genres', 'https://x.com/genres/ambient']);
});

test('only local and allow-listed image hosts go through the optimizer', () =>
  withEnv({ NEXT_PUBLIC_IMAGE_HOSTS: 'cdn.example.com' }, () => {
    assert.equal(canOptimize('/banners/a.jpg'), true);
    assert.equal(canOptimize('https://images.unsplash.com/photo-1'), true);
    assert.equal(canOptimize('https://cdn.example.com/a.jpg'), true);
    assert.equal(canOptimize('https://random-host.net/a.jpg'), false);
    assert.equal(canOptimize('http://images.unsplash.com/photo-1'), false);
    assert.equal(canOptimize('//evil.com/a.jpg'), false);
  }));
