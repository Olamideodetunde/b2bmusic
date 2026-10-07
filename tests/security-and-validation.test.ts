import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileRepo, sampleRows } from './helpers';
import { setRepositoryForTesting } from '../src/lib/db';
import { sessionSecret } from '../src/lib/auth/session';
import { issueLoginLink } from '../src/lib/auth/links';
import { isSameOriginRequest } from '../src/lib/auth/origin';
import { parseTrackRow } from '../src/lib/ingest/parse';
import { publishTrack } from '../src/lib/ingest/service';

async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const saved = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) (v === undefined ? delete process.env[k] : (process.env[k] = v));
  try {
    await fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) (v === undefined ? delete process.env[k] : (process.env[k] = v));
  }
}

test('production never runs sign-in on a missing or derived secret', () =>
  withEnv({ NODE_ENV: 'production', SESSION_SECRET: undefined, DATABASE_URL: 'postgres://u:p@h/db', INGESTION_API_KEY: 'k'.repeat(40) }, () => {
    assert.equal(sessionSecret(), null, 'no fallback derived from other configuration');
  }));

test('production never returns the sign-in link to the requester', async () => {
  const { repo, close } = await fileRepo();
  setRepositoryForTesting(repo);
  try {
    // Brevo missing in production: refuse, rather than hand out a link for any email.
    await withEnv({ NODE_ENV: 'production', ALLOW_FILE_STORE: 'true', BREVO_API_KEY: undefined }, async () => {
      const r = await issueLoginLink('https://site.com', 'victim@example.com', '/');
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.status, 503);
    });
    // Local development without Brevo: the link is returned so sign-in can be tested.
    await withEnv({ NODE_ENV: 'development', BREVO_API_KEY: undefined }, async () => {
      const r = await issueLoginLink('http://localhost:3000', 'dev@example.com', '/');
      assert.ok(r.ok && r.devLink?.startsWith('http://localhost:3000/api/auth/verify?token='));
    });
  } finally {
    setRepositoryForTesting(undefined);
    await close();
  }
});

test('cookie-authenticated POSTs must come from this site (CSRF)', () => {
  const req = (headers: Record<string, string>) => new Request('https://site.com/api/auth/logout', { method: 'POST', headers });
  assert.equal(isSameOriginRequest(req({ origin: 'https://site.com' })), true);
  assert.equal(isSameOriginRequest(req({ origin: 'https://evil.com' })), false);
  assert.equal(isSameOriginRequest(req({ 'sec-fetch-site': 'cross-site' })), false);
  assert.equal(isSameOriginRequest(req({ 'sec-fetch-site': 'same-origin' })), true);
});

test('malformed enrichment JSON is rejected instead of breaking the track page', async () => {
  const [row] = await sampleRows();
  const bad = parseTrackRow({ ...row, altMixes: '{}', stems: '"Drums"', syncMeta: '{"instrumentation":"Piano"}', vocalType: 'choir' });
  const fields = bad.errors.map(e => e.field).sort();
  assert.deepEqual(fields, ['altMixes', 'stems', 'syncMeta', 'vocalType']);
  const good = parseTrackRow({ ...row, altMixes: '[{"id":"a","name":"60s","type":"60s","durationSeconds":60,"audioUrl":"https://x.co/a.mp3"}]' });
  assert.equal(good.errors.length, 0);
  assert.equal(good.input?.altMixes?.length, 1);
});

test('sheet values that would break URLs or Postgres are rejected', async () => {
  const [row] = await sampleRows();
  assert.ok(parseTrackRow({ ...row, 'Track ID': '99999999999' }).errors.some(e => e.field === 'trackId'), 'beyond INTEGER range');
  assert.ok(parseTrackRow({ ...row, 'Use Cases': 'Brand Film, 日本' }).errors.some(e => e.field === 'useCases'), 'tag with no URL slug');
});

test('a Draft row is "not yet", never an error — even if it is incomplete', async () => {
  const { repo, close } = await fileRepo();
  try {
    const [row] = await sampleRows();
    const r = await publishTrack(repo, { ...row, Status: 'Draft', Genre: 'Polka' }, { checkAudioUrl: false });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.httpStatus, 409, 'Draft, not 422 — so no failure email');
  } finally {
    await close();
  }
});
