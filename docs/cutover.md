# Production cutover — upgrading the existing Neon database

The Neon database behind **b2bmusic.vercel.app** was created by the original bundle's schema. Migrations `002` and `003` upgrade it in place:

- **Schema:** the price column is renamed, the tag columns are converted, and missing columns are added.
- **Data:**
  - The 7 demo tracks move onto the sheet's genres. Their URLs are unchanged.
  - The two test rows are removed: #8 *Apex Solar Horizon Test* and #10 *Quantum Frontier*.

This was rehearsed on an exact replica built from the backup in `db/backups/`: **9 rows → 7**, with every slug unchanged. A second run is a no-op.

## Why the order matters

- The **old** deployed code can't read the new schema.
- The **new** code can't build against the old schema, because Vercel's build prerenders pages from the database.

So: **migrate, then deploy straight away.** In the minute or two between the two steps, the live site keeps serving its cached pages. Only uncached pages and the old publish endpoint fail.

## Steps

1. **Sync secrets.**
   - `INGESTION_API_KEY` and `REVALIDATION_SECRET` must match between `.env.local`, Vercel (Production and Preview) and the Make.com scenario. Either paste the values from `.env.local` into Vercel, or copy Vercel's existing values into `.env.local`.
   - Add `STRIPE_WEBHOOK_SECRET` (Stripe → Developers → Webhooks → endpoint `https://<domain>/api/stripe/webhook`).
2. **Get the new code ready to deploy.** Push it to the repository Vercel builds from, but don't trigger the production deploy yet.
3. **Migrate.** This reads `DATABASE_URL` from `.env.local`:
   ```bash
   npm run db:migrate
   ```
   Expect `applied 001_init.sql`, `applied 002_upgrade_legacy_tracks.sql`, `applied 003_legacy_data_cleanup.sql`.
4. **Deploy immediately.** Promote or trigger the production deployment in Vercel.
5. **Verify:**
   - `GET https://<domain>/api/health` returns `{"ok":true,"storage":"postgres","publishedTracks":7,…}`.
   - The home page lists 7 tracks.
   - `/tracks/stadium-rock-electronic-anthem-music` still loads.
   - `/genres/cinematic` exists.
   - `/sitemap.xml` lists 7 tracks.
6. **Publish test.** Run the sample sheet through the API. Its placeholder audio URL returns 404, so add `AUDIO_URL_CHECK=false` in Vercel for this test only, or use real MP3 links:
   ```bash
   npm run import:sheet -- fixtures/sample-track-index.csv --api https://<domain>
   ```

## Rollback

Restore `db/backups/neon-<timestamp>.json`. It contains every column and row as they were before the upgrade. Alternatively, use Neon's point-in-time restore (**Branches → Restore**) to a moment before step 3. That's the fastest route if anything looks wrong.
