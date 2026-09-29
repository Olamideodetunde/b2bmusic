# API reference

Base URL: `https://b2bproductionmusic.com` (or the staging URL).

## Authentication

Write and admin endpoints require the `INGESTION_API_KEY` secret:

```
Authorization: Bearer <INGESTION_API_KEY>
```

`x-api-key: <INGESTION_API_KEY>` also works. A missing or wrong key returns `401`. If the server has no key configured (or one shorter than 24 characters), every request returns `503`, so the API is never left open by accident.

## `POST /api/tracks` — create or update from a sheet row

This is the endpoint the Make.com scenario calls. Send one row as JSON. Keys can be the **sheet's own headers** or camelCase. Matching ignores case, spaces and punctuation, so `"Target Keyword"`, `"targetKeyword"` and `"target_keyword"` are all the same field.

| Sheet column | JSON key | Rules |
|---|---|---|
| A Title | `title` | required, ≤ 200 chars |
| B Target Keyword | `targetKeyword` | required, 3–120 chars. Becomes the URL slug. Must not already be targeted by another track |
| C Genre | `genre` | one of: Electronic, Cinematic, Corporate / Tech, Hip Hop, Indie Rock, Folk & Acoustic, Ambient |
| D BPM | `bpm` | 40–250 (`"128 BPM"` is fine) |
| E Musical Key | `musicalKey` | e.g. `A Minor`, `F# Major`, `Bbm`. Stored normalised as `A Minor` |
| F Duration | `duration` | `2:45`, or seconds. A Sheets time value (`2:45:00`) is corrected, with a warning |
| G Description | `description` | 60–3,000 chars, unique across the catalog |
| H Moods | `moods` | comma-separated (or an array), 1–12 tags |
| I Use Cases | `useCases` | comma-separated (or an array), 1–12 tags |
| J Audio URL | `audioUrl` | `https://` link to the MP3 preview. Checked to resolve to audio unless `AUDIO_URL_CHECK=false` |
| K Cover Image URL | `coverImageUrl` | optional, `https://` |
| L / M / N Standard / Commercial / Broadcast Price | `standardPrice`… | dollars (`10`, `"$1,250.00"`), $0.50–$100,000. Or send `standardPriceCents`… |
| O Status | `status` | optional. `Draft` is refused; anything else is processed |
| Q Track ID | `trackId` | blank = create; set = update that track |
| — | `fullAudioUrl` | optional. The licensed full-length file, linked in the purchase receipt |
| — | `altMixes`, `stems`, `syncMeta` | optional JSON enrichment (see `src/lib/db/types.ts`) |

`Live URL` (P) is ignored on input.

### Success — `201 Created` (new) / `200 OK` (update)

```json
{
  "ok": true,
  "status": "Published",
  "action": "created",
  "trackId": 7,
  "slug": "futuristic-solar-automotive-commercial-soundtrack",
  "liveUrl": "https://b2bproductionmusic.com/tracks/futuristic-solar-automotive-commercial-soundtrack",
  "warnings": [],
  "revalidated": ["/", "/pricing", "/tracks/futuristic-solar-automotive-commercial-soundtrack", "/genres/electronic", "/bpm/125-plus-bpm", "/use-cases/automotive-commercials", "…"]
}
```

Write back `status` → Status (O), `liveUrl` → Live URL (P) and `trackId` → Track ID (Q).

`warnings` are non-fatal and still published. Examples: the keyword changed on an update (the URL is kept), a retry was matched to an existing track, the prices aren't ascending, or the duration was auto-corrected.

### Failure

```json
{
  "ok": false,
  "status": "Error",
  "errorSummary": "audioUrl: Audio URL returned HTTP 404",
  "errors": [{ "field": "audioUrl", "message": "Audio URL returned HTTP 404" }],
  "warnings": []
}
```

| HTTP | Meaning | Sheet action |
|---|---|---|
| `422` | Validation failed: missing or invalid field, or unreachable audio | Status = Error, fix the row |
| `409` | Duplicate keyword, duplicate description, or the row is still Draft | Status = Error, fix the row |
| `404` | The Track ID doesn't exist (edited or copied between rows) | Status = Error, restore the original Track ID |
| `401` | Wrong API key | Fix the Make.com connection |
| `413` / `400` | Body over 256 KB / not JSON | Fix the Make.com JSON module |
| `500` / `503` | Server-side problem | **Retry.** Creates are idempotent, so a retry never duplicates a page |

Every call is recorded in `publish_events`. Rejected rows also trigger a Brevo alert to `BREVO_ADMIN_EMAIL`, and published rows trigger a "published / updated" alert.

## `PUT /api/tracks/:id` — explicit update

Same body and response as above. The `:id` in the URL wins over any Track ID in the body. `PATCH` is an alias.

## `GET /api/tracks/:id` — stored record *(auth)*

Returns `{ ok, track }`, including unpublished fields.

## `POST /api/revalidate` — refresh cached pages *(auth)*

```json
{ "trackId": 12 }                              // that track + every hub it appears on
{ "paths": ["/genres/ambient", "/pricing"] }   // specific paths (≤ 100)
{ "all": true }                                // every page, e.g. after a template deploy
```

Returns `{ ok: true, revalidated: [...] }`. You don't need this after a normal publish, because `POST /api/tracks` already refreshes the affected pages.

## `GET /api/publish-log?limit=50` — recent activity *(auth)*

Returns `{ ok, events: [{ id, trackId, action: "created" | "updated" | "rejected" | "revalidated", ok, message, createdAt }] }`, newest first.

## `GET /api/health` — uptime check *(public)*

```json
{ "ok": true, "storage": "postgres", "publishedTracks": 1240, "stripe": true, "email": true }
```

Returns `503` if the database is unreachable.

## Public endpoints used by the site

| Endpoint | Purpose |
|---|---|
| `GET /api/catalog?ids=1,2,3` | Published track data for the navbar Project Bin (≤ 100 ids, CDN-cached 60 s) |
| `POST /api/checkout` `{ slug, tier }` | Creates a Stripe Checkout session. `tier` ∈ `standard` / `commercial` / `broadcast`; the price is read from the database |
| `GET /api/checkout/session?session_id=cs_…` | Confirms a completed payment for the success message on the track page |
| `POST /api/stripe/webhook` | Stripe-signed. Records the order (idempotent per session) and emails the receipt |

## Example (curl)

```bash
curl -X POST https://b2bproductionmusic.com/api/tracks \
  -H "Authorization: Bearer $INGESTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "Title": "Titan Ascent",
    "Target Keyword": "cinematic hybrid orchestral trailer music",
    "Genre": "Cinematic", "BPM": 96, "Musical Key": "D Minor", "Duration": "2:30",
    "Description": "Epic hybrid orchestral cues featuring massive brass swells, taiko percussion hits, and sub-bass impacts.",
    "Moods": "Epic, Powerful, Heroic", "Use Cases": "Movie Trailers, Video Games",
    "Audio URL": "https://cdn.example.com/previews/titan-ascent.mp3",
    "Standard Price": 10, "Commercial Price": 20, "Broadcast Price": 40,
    "Status": "Ready"
  }'
```
