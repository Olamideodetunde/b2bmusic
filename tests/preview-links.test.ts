import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileRepo, okFetch, sampleRows } from './helpers';
import { setRepositoryForTesting, toPublicTrack, getAllTracks } from '../src/lib/db';
import { publishTrack, checkAudioUrl } from '../src/lib/ingest/service';
import { previewKeyFromUrl, playablePreviewUrl } from '../src/lib/storage/preview';
import { GET as previewRoute } from '../src/app/api/preview/[trackId]/route';

const BASE = 'https://f005.backblazeb2.com/file/b2bmusic';
const STORAGE = {
  S3_ACCESS_KEY_ID: 'test-key-id',
  S3_SECRET_ACCESS_KEY: 'test-secret',
  S3_REGION: 'us-east-005',
  S3_ENDPOINT: 'https://s3.us-east-005.backblazeb2.com',
  S3_MASTERS_BUCKET: 'b2bmusic',
  S3_PREVIEWS_BUCKET: 'b2bmusic',
  PREVIEW_PUBLIC_BASE_URL: BASE,
};

async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const saved = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) (v === undefined ? delete process.env[k] : (process.env[k] = v));
  delete (globalThis as any).__gb2bS3; // the S3 client caches its config
  try {
    await fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) (v === undefined ? delete process.env[k] : (process.env[k] = v));
    delete (globalThis as any).__gb2bS3;
  }
}

const get = (id: number | string, headers: Record<string, string> = {}, query = '') =>
  previewRoute(new Request(`https://site.test/api/preview/${id}${query}`, { headers }), { params: { trackId: String(id) } });

test('preview storage keys are recognised only on our previews base URL', () =>
  withEnv(STORAGE, () => {
    assert.equal(previewKeyFromUrl(`${BASE}/previews/forensic-clock-04-5fd669ab0f.mp3`), 'previews/forensic-clock-04-5fd669ab0f.mp3');
    assert.equal(previewKeyFromUrl(`${BASE}/previews/a%20b.mp3?x=1`), 'previews/a b.mp3');
    assert.equal(previewKeyFromUrl('https://cdn.example.com/previews/x.mp3'), null);
    assert.equal(previewKeyFromUrl(`${BASE}/../masters/x.wav`), null);
  }));

test('signed preview links point at the private object and expire', () =>
  withEnv(STORAGE, async () => {
    const signed = new URL(await playablePreviewUrl(`${BASE}/previews/track-01-abc.mp3`));
    assert.equal(signed.pathname, '/b2bmusic/previews/track-01-abc.mp3');
    assert.ok(signed.searchParams.get('X-Amz-Signature'));
    assert.equal(signed.searchParams.get('X-Amz-Expires'), '900');
    assert.equal(await playablePreviewUrl('https://cdn.example.com/x.mp3'), 'https://cdn.example.com/x.mp3', 'other hosts pass through');
  }));

test('pages only ever see /api/preview paths, never storage URLs', async () => {
  const { repo, close } = await fileRepo();
  setRepositoryForTesting(repo);
  try {
    const [row] = await sampleRows();
    const r = await publishTrack(repo, { ...row, 'Audio URL': `${BASE}/previews/demo-1234567890.mp3`, Status: 'Ready' }, { fetchImpl: okFetch });
    assert.ok(r.ok);
    const [track] = await getAllTracks();
    assert.equal(track.previewAudioUrl, `/api/preview/${track.id}`);
    assert.ok(!JSON.stringify(track).includes('backblazeb2'), 'no storage URL in public track data');
    const withMix = toPublicTrack({ ...track, altMixes: [{ id: '60s', name: '60s', type: '60s', durationSeconds: 60, audioUrl: `${BASE}/previews/x.mp3` }] });
    assert.equal(withMix.altMixes[0].audioUrl, `/api/preview/${track.id}?mix=60s`);
  } finally {
    setRepositoryForTesting(undefined);
    await close();
  }
});

test('/api/preview signs published previews and refuses everything else', () =>
  withEnv(STORAGE, async () => {
    const { repo, close } = await fileRepo();
    setRepositoryForTesting(repo);
    try {
      const [row] = await sampleRows();
      const r = await publishTrack(repo, { ...row, 'Audio URL': `${BASE}/previews/demo-1234567890.mp3`, Status: 'Ready' }, { fetchImpl: okFetch, checkAudioUrl: false });
      assert.ok(r.ok);
      const id = r.ok ? r.trackId : 0;

      const ok = await get(id, { 'sec-fetch-site': 'same-origin' });
      assert.equal(ok.status, 302);
      const target = new URL(ok.headers.get('location')!);
      assert.equal(target.pathname, '/b2bmusic/previews/demo-1234567890.mp3');
      assert.ok(target.searchParams.get('X-Amz-Signature'), 'signed, so it works on a private bucket');
      assert.match(ok.headers.get('cache-control') ?? '', /no-store/);

      assert.equal((await get(id, { 'sec-fetch-site': 'cross-site' })).status, 403, 'hot-linking from other sites');
      assert.equal((await get(999999)).status, 404, 'unknown track');
      assert.equal((await get('abc')).status, 404, 'bad id');
      assert.equal((await get(id, {}, '?mix=nope')).status, 404, 'unknown alt mix');
    } finally {
      setRepositoryForTesting(undefined);
      await close();
    }
  }));

test('publish check uses storage credentials for our previews, not a public request', () =>
  // Storage endpoint on a closed local port: the check fails fast and offline.
  withEnv({ ...STORAGE, S3_ENDPOINT: 'http://127.0.0.1:9' }, async () => {
    let fetched = false;
    const spyFetch = (async () => { fetched = true; return new Response(null, { status: 200 }); }) as typeof fetch;
    // Fake credentials: the storage check fails to authenticate, but it must not fall back to a public fetch.
    const problem = await checkAudioUrl(`${BASE}/previews/x.mp3`, spyFetch);
    assert.equal(fetched, false);
    assert.ok(problem, 'reported as a storage problem');
    assert.equal(await checkAudioUrl('https://cdn.example.com/x.mp3', spyFetch), null);
    assert.equal(fetched, true, 'other hosts are still checked by URL');
  }));
