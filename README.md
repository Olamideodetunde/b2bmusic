# B2BProductionMusic.com — Programmatic Landing Page Infrastructure

Fullstack programmatic music landing page architecture for **B2BProductionMusic.com**, designed and built to meet high-performance technical SEO standards, automated publishing via Make.com and Google Sheets, and instant on-demand Incremental Static Regeneration (ISR).

---

## 1. System Architecture

```
[ Google Sheets Master Index ]
              │
              ▼ (New row added)
[ Make.com Automation Scenario ]
              │
              ▼ (POST /api/tracks/ingest + Bearer INGESTION_API_KEY)
┌────────────────────────────────────────────────────────┐
│ Next.js App Router (Hosted on Vercel)                  │
│                                                        │
│ 1. Validate payload (Zod schema)                       │
│ 2. Generate SEO-optimized slug (makeUniqueSlug)        │
│ 3. Upsert record into Neon Serverless Postgres         │
│ 4. Fire On-Demand ISR Revalidation (`revalidatePath`)  │
│ 5. Trigger Brevo publish notification email            │
│ 6. Return live URL for Make.com Google Sheets update   │
└────────────────────────────────────────────────────────┘
              │
              ├──► [ Neon Postgres Database (Single source of truth) ]
              │
              ├──► [ Brevo Email API (Alerts & Purchase Receipts) ]
              │
              └──► [ Stripe Checkout (Instant Direct Sync Purchase) ]
```

---

## 2. Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript + React
- **Styling**: Tailwind CSS + Lucide Icons
- **Publishing Method**: Incremental Static Regeneration (ISR) + On-demand revalidation
- **Database**: Neon Serverless Postgres (`@neondatabase/serverless`)
- **Automation**: Make.com webhook integration
- **Email**: Brevo (Sendinblue) Transactional API
- **Payments**: Stripe Checkout & Webhook handler
- **Master Data Entry**: Google Sheets

---

## 3. Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Default dev values are already provided in `.env.local`. When ready for production, plug in your real Neon, Brevo, and Stripe credentials.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the catalog.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 4. Google Sheets Column Mapping for Make.com

Your Google Sheet should have the following headers (Row 1):

| Column Name | Type | Example |
| :--- | :--- | :--- |
| `title` | Text | `Apex Innovation` |
| `targetKeyword` | Text | `corporate tech innovation background music` |
| `bpm` | Number | `124` |
| `musicalKey` | Text | `C Major` |
| `genre` | Text | `Corporate Pop` |
| `moods` | Comma Text | `Inspiring, Optimistic, Forward-Thinking` |
| `useCases` | Comma Text | `SaaS Product Demo, Investor Pitch Deck` |
| `description` | Text | `An uplifting, modern corporate track featuring crisp delayed electric guitars...` |
| `previewAudioUrl` | URL | `https://cdn.example.com/audio/preview-1.mp3` |
| `coverImageUrl` | URL (Optional) | `https://images.unsplash.com/...` |
| `standardPriceCents` | Number (Optional) | `4900` ($49.00) |
| `broadcastPriceCents` | Number (Optional) | `19900` ($199.00) |
| `status` | Text (Write-back) | Updated by Make.com with live URL |

---

## 5. Make.com Scenario Configuration

1. **Trigger Module**: `Google Sheets` -> *Watch Rows* (watches the master track spreadsheet).
2. **HTTP Module**: *Make a request*:
   - **URL**: `https://b2bproductionmusic.com/api/tracks/ingest`
   - **Method**: `POST`
   - **Headers**:
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <YOUR_INGESTION_API_KEY>`
   - **Body Type**: `Raw (JSON)`
   - **Request Content**:
     ```json
     {
       "title": "{{1.title}}",
       "targetKeyword": "{{1.targetKeyword}}",
       "bpm": {{1.bpm}},
       "musicalKey": "{{1.musicalKey}}",
       "genre": "{{1.genre}}",
       "moods": "{{1.moods}}",
       "useCases": "{{1.useCases}}",
       "description": "{{1.description}}",
       "previewAudioUrl": "{{1.previewAudioUrl}}",
       "coverImageUrl": "{{1.coverImageUrl}}",
       "standardPriceCents": {{1.standardPriceCents}},
       "broadcastPriceCents": {{1.broadcastPriceCents}}
     }
     ```
3. **Google Sheets Module**: *Update a Row*
   - Write back `{{2.data.liveUrl}}` and `Published` into the `status` column.

---

## 6. Testing the Ingestion API Locally

Run the automated test script while your Next.js server is running:
```bash
node scripts/test-ingest.mjs
```

---

## 7. Technical SEO Features Included

1. **Unique Intent Slugs**: Generated from the buyer search intent keyword with automatic duplicate avoidance (e.g. `/tracks/corporate-tech-innovation-background-music`).
2. **Dynamic Metadata**: Title, description, and canonical tags generated per page.
3. **Structured Data (Schema.org)**:
   - `AudioObject` with duration, encoding format, and stream URL.
   - `Product` with pricing tiers ($49 - $199 USD).
   - `BreadcrumbList` for Google search hierarchy.
4. **Hub Pages (Anti-Orphan Architecture)**:
   - Genre hubs: `/genres/[genre]`
   - Use-case hubs: `/use-cases/[useCase]`
5. **Dynamic Sitemap & Robots.txt**:
   - `/sitemap.xml` automatically includes all tracks and hubs.
   - `/robots.txt` guides search engine crawlers.

---

## 8. Deployment on Vercel

1. Push this repository to GitHub.
2. Import the project into Vercel.
3. In Vercel Project Settings > **Environment Variables**, add:
   - `DATABASE_URL` (From Neon dashboard)
   - `INGESTION_API_KEY`
   - `REVALIDATION_SECRET`
   - `BREVO_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_SITE_URL` (e.g. `https://b2bproductionmusic.com`)
4. Deploy!
