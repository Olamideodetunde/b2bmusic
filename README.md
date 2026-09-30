# GlobalB2BAudioHolding.com — Programmatic Landing Page Infrastructure

Every track in the Google Sheet master index gets its own SEO landing page, published automatically:

```
Google Sheet ──(Status = Ready)──▶ Make.com ──POST /api/tracks──▶ API ──▶ Neon (Postgres)
     ▲                                                              │
     └──── Status · Live URL · Track ID ◀── write-back ─────────────┤
                                                                    ▼
                                     Next.js ISR refreshes only that track's pages
```

| Layer | Technology | Where |
|---|---|---|
| Website engine | Next.js 14 (App Router) | `src/app` |
| Publishing | On-demand Incremental Static Regeneration | `src/lib/api/publish-handler.ts` |
| Data entry | Google Sheets ("Track Index" tab) | sample: `fixtures/sample-track-index.csv` |
| Database | Neon Postgres (any Postgres works, e.g. Railway) | `db/migrations`, `src/lib/db` |
| Automation | Make.com | [docs/make-scenario.md](docs/make-scenario.md) |
| Hosting | Vercel | — |
| Email | Brevo (publish alerts, purchase receipts) | `src/lib/email/brevo.ts` |
| Payments | Stripe Checkout (single-track licenses + all-access subscription) + webhook | `src/app/api/checkout`, `src/app/api/subscribe`, `src/app/api/stripe` |
| Accounts | Magic-link email sign-in, signed session cookie | `src/lib/auth`, `src/app/api/auth` |
| Audio storage | Amazon S3 or Backblaze B2 — private masters, public watermarked previews | `src/lib/storage`, `src/app/api/download` |
| Watermarking | FFmpeg (bundled via `ffmpeg-static`) | `scripts/watermark-catalog.ts`, `src/lib/audio` |

More docs: **[Audio protection, subscriptions & downloads](docs/audio-and-access.md)** · **[API reference](docs/api.md)** · **[Make.com scenario](docs/make-scenario.md)** · **[Keyword index guide](docs/MASTER_KEYWORD_PIPELINE.md)** · **[Production cutover](docs/cutover.md)** (upgrading the existing Neon database)

---

## Quick start (local, no accounts needed)

Requires Node 20.12+ (Node 22+ to run the test suite).

```bash
npm install
cp .env.example .env.local        # optional — everything has a local fallback
npm run dev                       # http://localhost:3000
```

Without `DATABASE_URL` the app uses a local JSON store in `.data/local-db.json`, seeded with a six-track demo catalog. Delete that file to reset. Without Stripe or Brevo keys, checkout reports "not configured" and emails are logged to the console instead of sent.

### Try the full publish pipeline locally

```bash
# 1. give the API a key (also put INGESTION_API_KEY=… in .env.local, then restart `npm run dev`)
export INGESTION_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")

# 2. validate the sample sheet without publishing
npm run import:sheet -- fixtures/sample-track-index.csv --dry-run

# 3. publish it through the API, exactly like Make.com would
npm run import:sheet -- fixtures/sample-track-index.csv --api http://localhost:3000
```

Step 3 writes `fixtures/sample-track-index.results.csv` with the write-back columns (Status, Live URL, Track ID) filled in.

> **Note on the sample sheet:** its Audio URL (`https://b2bmusic.vercel.app/audio/demo.mp3`) returns **HTTP 404**, so with the audio check on, every sample row is correctly rejected with *Status = Error*. Use real MP3 URLs, or set `AUDIO_URL_CHECK=false` to test with placeholders.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | 67 tests: sheet parsing, API auth, accounts & access rules, the real FFmpeg watermark pipeline, SEO helpers, backup restore and the full publish rules, run against real Postgres (PGlite, using the production migrations) **and** the local store |
| `npm run typecheck` | TypeScript |
| `npm run db:migrate` | Applies `db/migrations/*.sql` to `DATABASE_URL`. Idempotent — run on every deploy |
| `npm run db:seed` | Loads the demo catalog through the publish pipeline. Idempotent |
| `npm run audio:watermark -- --in <folder> [--aiff] [--upload]` | Builds 128 kbps watermarked previews + masters and uploads them to the buckets ([details](docs/audio-and-access.md#2-watermarking-the-catalog-ffmpeg)) |
| `npm run db:restore -- <backup.json>` | Loads a JSON backup into a new side table for inspection or recovery (see [cutover](docs/cutover.md#rollback)) |
| `npm run import:sheet -- <file.csv>` | Bulk-publish test batch / Make.com stand-in (`--dry-run`, `--api <url>`) |

> Never run `npm run build` while `npm run dev` is running — both write to `.next/` and the dev server will start serving 500s with no styles. If that happens: stop the dev server, delete `.next`, and start it again.

---

## Publishing rules (enforced by the API)

These mirror the sheet's **How to use** tab. They're implemented in `src/lib/ingest/service.ts` and covered by `tests/service.test.ts`.

- **New track:** a row with no Track ID creates a page at `/tracks/<slug>`, where the slug comes from the **Target Keyword**. The API returns the Track ID and Live URL for Make.com to write back.
- **Edit:** a row with a Track ID updates that page **in place**. The URL never changes, even if the keyword is edited, so links and rankings survive. The response includes a warning when that happens.
- **Retries are safe:** a create that arrives without a Track ID but matches an existing track's *title + keyword* updates that track instead of duplicating it. This covers the case where a Make.com run published but failed to write back.
- **No duplicate or doorway pages:**
  - A second track can't target a keyword another track already owns (`409`).
  - Descriptions must be unique and at least 60 characters (`409` / `422`).
  - Keywords that happen to produce the same slug get `-2`, `-3`…
- **Validation:**
  - Genre must be one of the sheet's dropdown values.
  - BPM must be between 40 and 250, the key must be recognisable ("A Minor", "F# Major"), and Duration must read like `2:45`.
  - At least one mood and one use case are required.
  - Prices must be valid.
  - The Audio URL must actually resolve to audio (`AUDIO_URL_CHECK`).
  - Every field error is returned at once, so a row can be fixed in one pass.
- **Draft rows are refused (`409`).** Only *Ready* rows publish.
- **Targeted refresh:** a publish revalidates only that track's page, its genre / use-case / BPM hubs, the home page and pricing. The nav and footer (root layout) refresh only when the set of genres changes. The sitemap is rendered per request, so it's always current.

## SEO

- A unique `<title>`, description, canonical URL and Open Graph tags per track, built from the track's own keyword and description.
- Structured data: **Product** (three license Offers), **AudioObject**, **BreadcrumbList**, and **CollectionPage/ItemList** on hub pages. There is deliberately **no** `aggregateRating`: the original template shipped a hard-coded 4.9★ rating, which Google treats as fake review markup.
- Hub pages for **genre** (`/genres/*`), **use case** (`/use-cases/*`) and **tempo** (`/bpm/under-90-bpm`, `/bpm/90-124-bpm`, `/bpm/125-plus-bpm`). Every track is linked from at least three hubs, the home catalog and the sitemap, and each track page links back to its genre and tempo hubs. No page is orphaned.
  - Directory pages at `/genres`, `/use-cases` and `/bpm` list every hub. Breadcrumbs (visible and BreadcrumbList schema) follow the same trail: Home › Genres › Cinematic › Track.
  - Hub copy and meta descriptions are **written from each hub's own tracks**: count, tempo range, genres, moods and use cases. No two hubs share text.
  - **Thin hubs are held back.** A hub with fewer than 2 tracks (`MIN_INDEXABLE_HUB_TRACKS` in `src/lib/seo/hubs.ts`) renders and passes links, but is `noindex` and kept out of the sitemap. It becomes indexable on its own as soon as a second track joins.
- `/sitemap.xml` (per-track `lastmod`) and `/robots.txt` (API routes disallowed).
- **Staging is never indexed.** Vercel Preview deployments (`VERCEL_ENV` ≠ `production`) serve `noindex` and a `Disallow: /` robots.txt; on other hosts set `NOINDEX=true`.
- Track titles are keyword-led and kept under ~65 characters; descriptions are trimmed on a word boundary to fit the snippet.
- Core Web Vitals:
  - The audio loads only when a visitor presses play (`preload="none"`).
  - Every image goes through `next/image` (AVIF/WebP, resized per device, lazy-loaded; the hero and cover are prioritised for LCP). Only site images and allow-listed hosts are optimized: `images.unsplash.com`, plus any added in `NEXT_PUBLIC_IMAGE_HOSTS`. A cover on another host still renders, as a lazy `<img>` with fixed dimensions.

---

## Deployment (Vercel + Neon)

The client creates the accounts (proposal §9); these are the configuration steps.

### 1. Neon — staging and production

1. Create a Neon project. Use the default branch as **production** and create a branch called **staging**.
2. For each branch, copy two connection strings:
   - **Pooled** (host contains `-pooler`): the app's `DATABASE_URL`.
   - **Direct**: used only for migrations.
3. Migrate both:
   ```bash
   DATABASE_URL="<direct connection string>" npm run db:migrate
   ```
4. Optional, staging only: `DATABASE_URL="<staging direct>" npm run db:seed`

### 2. Vercel

1. Import the repository. The framework preset is Next.js and the defaults are fine.
2. Under **Settings → Environment Variables**, set everything in [`.env.example`](.env.example):
   - **Production** → the Neon production branch, live Stripe keys, `NEXT_PUBLIC_SITE_URL=https://globalb2baudioholding.com`
   - **Preview** → the Neon staging branch, Stripe **test** keys, the staging URL
3. Use the **Pro** plan: Hobby is non-commercial only (proposal §12).
4. Add the domain under **Settings → Domains**.

### 3. Stripe

1. Under **Developers → Webhooks**, add the endpoint `https://<domain>/api/stripe/webhook` with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded` (a full refund marks the order `refunded`).
2. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`. Do this separately for test mode (staging) and live mode (production).

Prices come from each track's sheet row. Checkout sessions are created server-side from the database, so the browser can never set a price. Paid orders are stored in `orders` and trigger a Brevo receipt. The receipt includes a download link when the track has a `full_audio_url` set, and otherwise says files will follow from the licensing team.

### 4. Brevo

1. Verify the sending domain (proposal §9).
2. Create an API key and set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (an address on the verified domain) and `BREVO_ADMIN_EMAIL` (who receives publish alerts).

### 5. Make.com

Follow **[docs/make-scenario.md](docs/make-scenario.md)**.

### 6. Launch QA

1. Export a batch of real rows as CSV.
2. Dry-run it:
   ```bash
   npm run import:sheet -- batch.csv --dry-run
   ```
3. Publish it to **staging**:
   ```bash
   INGESTION_API_KEY=<staging key> npm run import:sheet -- batch.csv --api https://<staging-url>
   ```
4. Spot-check the pages, hubs and `/sitemap.xml`.
5. Run the same batch through Make.com against production.
6. In Google Search Console, add the domain property, submit `https://<domain>/sitemap.xml`, and watch **Pages → Indexing** for the first few weeks.

---

## Operations

| Task | How |
|---|---|
| Publish a track | Fill columns A–N, leave Live URL and Track ID blank, set Status = **Ready** |
| Edit a track | Edit the row, keep the Track ID, set Status back to **Ready** |
| A row shows **Error** | Check the alert email (or `GET /api/publish-log`), fix the row, set **Ready** again |
| Refresh pages without re-publishing | `POST /api/revalidate` with `{ "trackId": 12 }`, or `{ "all": true }` after a template deploy |
| Unpublish a track | Not part of the sheet flow. Run `UPDATE tracks SET is_published = false WHERE id = 12;` in the Neon SQL editor, then `POST /api/revalidate {"all": true}` |
| Health check / uptime monitor | `GET /api/health` |
| Change the genre list | Update `GENRES` in `src/lib/catalog/taxonomy.ts` **and** the sheet's Genre dropdown together |

### Recommended sheet tweaks

- Format the **Duration** column as *Plain text*. Otherwise Sheets turns `2:45` into a time of day. The API detects and corrects this, but it adds a warning.
- Optionally add a **Last Error** column (R) and have Make.com write the API's `errorSummary` into it, so the reason is visible next to the row.

## Brand & theme

The site follows the **GlobalB2BAudioHolding.com** logo.

| What | Where |
|---|---|
| Name, domain, tagline, contact email, logo paths | `src/lib/brand.ts` (the contact email can be overridden with `NEXT_PUBLIC_CONTACT_EMAIL`) |
| Color scales: `navy` (surfaces and ink), `brand` (royal blue, primary actions), `gold` (premium accents, used sparingly) | `tailwind.config.ts`, with matching CSS variables in `src/app/globals.css` |
| Logo component: a vector mark plus a live-text Montserrat wordmark. `tone="onDark"` is the reversed version for the navy site; `tone="onLight"` matches the original artwork. | `src/components/brand/Logo.tsx` |
| Master logo on white, used for schema.org `Organization.logo` and emails | `public/brand/logo.jpg` |
| Default share image, 1200×630 | `public/brand/og-default.jpg` |
| Favicon and Apple touch icon | `src/app/icon.svg`, `src/app/apple-icon.png` |

Transactional emails use a light layout with the full logo, so they look right in every mail client.

## Project layout

```
db/migrations/           SQL migrations (schema: tracks, publish_events, orders)
docs/                    API reference, Make.com scenario
fixtures/                sample Google Sheet export
scripts/                 migrate, seed, import-sheet, restore-backup
src/app/                 pages (home, tracks, genres, use-cases, bpm, pricing) + API routes
src/components/brand/    logo lockup + mark
src/components/ui/       CoverImage (next/image with a safe fallback for unknown hosts)
src/lib/brand.ts         brand identity (name, domain, contact, logo paths)
src/lib/catalog/         taxonomy: genres, statuses, tempo bands (mirrors the sheet dropdowns)
src/lib/db/              repository interface, Postgres + local-file implementations
src/lib/ingest/          sheet-row parsing/validation, publish service, CSV
src/lib/seo/             slugs, hub SEO (data-driven copy, thin-hub noindex, breadcrumbs)
src/lib/licensing.ts     license tiers (Standard / Commercial / Broadcast)
tests/                   node:test suites
```

## Known limitations

- **Audio compression isn't automated.** The sheet's Audio URL is expected to already point at a compressed MP3 preview. The API checks that it resolves to audio, but doesn't transcode.
- **Stems, alt-mixes and cue-sheet metadata** (composer, publisher, ISRC) are not sheet columns. The page shows them when present in the database and hides them cleanly when absent. They can be supplied as extra JSON fields (`altMixes`, `stems`, `syncMeta`) or added as sheet columns later.
- **The local JSON store is for development only.** In production, writes without `DATABASE_URL` fail loudly (HTTP 503) rather than silently losing data.
- **No Make.com blueprint is included.** The scenario lives in the client's account, and an untested export would be worse than precise instructions. The guide lists every module and setting.
