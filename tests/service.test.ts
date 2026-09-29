import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { publishTrack } from '../src/lib/ingest/service';
import type { TrackRepository } from '../src/lib/db/repository';
import { fileRepo, notFoundFetch, okFetch, pgliteRepo, sampleRows } from './helpers';

/**
 * The publish rules from the sheet's "How to use" tab, run against BOTH storage
 * backends so Postgres (Neon) and the local file store can never drift apart.
 */
for (const [name, make] of [['postgres (PGlite)', pgliteRepo], ['file store', fileRepo]] as const) {
  describe(`publish pipeline — ${name}`, () => {
    let repo: TrackRepository;
    let close: () => Promise<void>;
    let rows: Record<string, string>[];
    const opts = { fetchImpl: okFetch };

    before(async () => {
      ({ repo, close } = await make());
      rows = await sampleRows();
    });
    after(() => close());

    test('a Ready row without Track ID creates a page and returns write-back values', async () => {
      const r = await publishTrack(repo, rows[0], opts);
      assert.ok(r.ok, JSON.stringify(r));
      assert.equal(r.action, 'created');
      assert.equal(r.status, 'Published');
      assert.equal(r.slug, 'futuristic-solar-automotive-commercial-soundtrack');
      assert.match(r.liveUrl, /\/tracks\/futuristic-solar-automotive-commercial-soundtrack$/);
      assert.ok(r.trackId > 0);
      assert.ok(r.paths.includes('/tracks/futuristic-solar-automotive-commercial-soundtrack'));
      assert.ok(r.paths.includes('/genres/electronic'));
      assert.ok(r.paths.includes('/bpm/125-plus-bpm'));
      assert.ok(r.paths.includes('/use-cases/automotive-commercials'));
      assert.ok(r.paths.includes('/pricing'), 'from-prices on the pricing page can change');
      assert.equal(r.layoutChanged, true, 'first Electronic track adds a genre to the nav');
      assert.equal((await repo.findBySlug(r.slug))?.title, 'Apex Solar Pulse');
    });

    test('bulk batch: the rest of the sample sheet publishes', async () => {
      for (const row of rows.slice(1)) {
        const r = await publishTrack(repo, row, opts);
        assert.ok(r.ok, `${row.Title}: ${r.ok ? '' : r.errorSummary}`);
      }
      assert.equal((await repo.listPublished()).length, 4);
    });

    test('an edited row with its Track ID updates in place — same URL, no duplicate', async () => {
      const original = (await repo.findBySlug('futuristic-solar-automotive-commercial-soundtrack'))!;
      const edited = { ...rows[0], 'Track ID': String(original.id), 'Standard Price': '15', Description: rows[0].Description + ' Now with a 15-second sting.', 'Target Keyword': 'electric vehicle launch commercial music' };
      const r = await publishTrack(repo, edited, opts);
      assert.ok(r.ok, JSON.stringify(r));
      assert.equal(r.action, 'updated');
      assert.equal(r.trackId, original.id);
      assert.equal(r.slug, original.slug, 'URL must not change when the keyword is edited');
      assert.ok(r.warnings.some(w => /URL stays/.test(w)));
      const stored = (await repo.findById(original.id))!;
      assert.equal(stored.standardPriceCents, 1500);
      assert.equal((await repo.listPublished()).length, 4);
    });

    test('a retried create (Make.com lost the write-back) updates instead of duplicating', async () => {
      const r = await publishTrack(repo, rows[1], opts); // Titan Ascent again, no Track ID
      assert.ok(r.ok);
      assert.equal(r.action, 'updated');
      assert.ok(r.warnings.some(w => /instead of creating a duplicate/.test(w)));
      assert.equal((await repo.listPublished()).length, 4);
    });

    test('a different track targeting a taken keyword is rejected (no competing pages)', async () => {
      const r = await publishTrack(repo, { ...rows[1], Title: 'Titan Ascent II', Description: 'A different description '.repeat(4) }, opts);
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.equal(r.httpStatus, 409);
        assert.equal(r.errors[0].field, 'targetKeyword');
      }
    });

    test('a copied description is rejected (no doorway pages)', async () => {
      const r = await publishTrack(repo, { ...rows[2], Title: 'Copy', 'Target Keyword': 'unique keyword for copy test' }, opts);
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.errors[0].field, 'description');
    });

    test('keywords that slugify identically get a -2 suffix', async () => {
      const r = await publishTrack(repo, {
        ...rows[3], Title: 'Silicon Sunset (Alt)', 'Target Keyword': 'LoFi Hip-Hop Tech Explainer Background Music!',
        Description: 'An alternate cut with brighter keys and a lighter kick, for daytime explainer edits.',
      }, opts);
      assert.ok(r.ok, r.ok ? '' : r.errorSummary);
      assert.equal(r.slug, 'lofi-hip-hop-tech-explainer-background-music-2');
      assert.ok(r.warnings.some(w => /was taken/.test(w)));
    });

    test('Draft rows, unknown Track IDs and dead audio links are refused', async () => {
      const draft = await publishTrack(repo, { ...rows[0], Status: 'Draft' }, opts);
      assert.equal(draft.ok, false);
      if (!draft.ok) assert.equal(draft.httpStatus, 409);

      const ghost = await publishTrack(repo, { ...rows[0], 'Track ID': '99999' }, opts);
      assert.equal(ghost.ok, false);
      if (!ghost.ok) assert.equal(ghost.httpStatus, 404);

      const dead = await publishTrack(repo, {
        ...rows[0], Title: 'Dead Link', 'Target Keyword': 'dead link test keyword',
        Description: 'A perfectly good description that is long enough to pass validation rules.',
        'Audio URL': 'https://cdn.example.com/missing.mp3',
      }, { fetchImpl: notFoundFetch });
      assert.equal(dead.ok, false);
      if (!dead.ok) {
        assert.equal(dead.errors[0].field, 'audioUrl');
        assert.match(dead.errorSummary, /404/);
      }
    });

    test('every call is logged for monitoring', async () => {
      const events = await repo.recentEvents(50);
      assert.ok(events.some(e => e.action === 'created' && e.ok));
      assert.ok(events.some(e => e.action === 'updated' && e.ok));
    });

    test('Stripe webhook orders are idempotent', async () => {
      const track = (await repo.listPublished())[0];
      const order = { stripeSessionId: 'cs_test_123', trackId: track.id, tier: 'commercial', amountCents: 2000, currency: 'usd', customerEmail: 'buyer@example.com' };
      assert.equal(await repo.createOrder(order), true);
      assert.equal(await repo.createOrder(order), false, 'a retried webhook must not create a second order');
    });
  });
}
