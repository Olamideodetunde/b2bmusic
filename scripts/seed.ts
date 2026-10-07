/**
 * npm run db:seed — loads the demo catalog (src/lib/db/mock-data.ts) through the same
 * publish pipeline Make.com uses, so seed data obeys every validation rule.
 * Idempotent: re-running updates the same tracks instead of duplicating them.
 *
 * Writes to the local .data store by default. Seeding a Postgres database (it can overwrite
 * live tracks that share a demo title + keyword) needs an explicit opt-in:
 *   SEED_DATABASE=yes npm run db:seed
 */
import './env';
import { getRepository } from '../src/lib/db';
import { initialTracks } from '../src/lib/db/mock-data';
import { publishTrack } from '../src/lib/ingest/service';

async function main() {
  if (process.env.DATABASE_URL && process.env.SEED_DATABASE !== 'yes') {
    const host = (() => { try { return new URL(process.env.DATABASE_URL!).hostname; } catch { return 'the configured database'; } })();
    console.error(`Refusing to seed ${host}: demo data would be published there (and could overwrite live tracks).\n` +
      'Use the local store (unset DATABASE_URL), or opt in with SEED_DATABASE=yes for a staging database.');
    process.exit(1);
  }
  const repo = getRepository();
  console.log(`Seeding ${initialTracks.length} demo tracks into ${repo.kind} storage…`);
  let failed = 0;

  for (const { id: _id, slug: _slug, isPublished: _p, publishedAt: _a, updatedAt: _u, ...track } of initialTracks) {
    const result = await publishTrack(repo, track as Record<string, unknown>, { checkAudioUrl: false });
    if (result.ok) {
      console.log(`  ✓ ${result.action.padEnd(7)} #${result.trackId} /tracks/${result.slug}`);
    } else {
      failed++;
      console.log(`  ✗ ${track.title}: ${result.errorSummary}`);
    }
  }
  if (failed) process.exitCode = 1;
  process.exit();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
