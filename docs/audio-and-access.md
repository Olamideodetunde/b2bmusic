# Audio protection, subscriptions & downloads

This covers how audio is stored, how previews are watermarked, and who can download masters. The site sells two ways:

- **All-access subscription** (Stripe, recurring). The whole catalog, unlimited master downloads.
- **Single-track sync license** (Stripe, one-time). One track, one of three tiers.

```
            ┌──────────── public ────────────┐        ┌───────────── private ─────────────┐
 Browser ── │ player streams 128 kbps MP3    │        │ masters bucket (WAV / AIFF)        │
            │ preview, watermark every 12 s  │        │ never public, no URLs in the DB    │
            └──────────────▲─────────────────┘        └──────────────▲────────────────────┘
                previews bucket / CDN                                 │ 60-second signed link
                                                     /api/download/:id ── checks session:
                                                        subscription active?  → yes
                                                        license for track?    → yes
                                                        signed receipt link?  → yes
                                                        otherwise             → 401 / 403
```

## 1. Where audio lives

**No audio is committed to this repository or deployed to Vercel.**

- `.gitignore` blocks audio file types.
- A test fails if any audio file appears under `public/`.

| Bucket | Visibility | Holds | Env var |
|---|---|---|---|
| Masters | **Private** (no public access, no bucket policy) | 24-bit WAV and AIFF, untouched | `S3_MASTERS_BUCKET` |
| Previews | Public read, ideally behind a CDN | 128 kbps watermarked MP3s | `S3_PREVIEWS_BUCKET`, `PREVIEW_PUBLIC_BASE_URL` |

Amazon S3 and Backblaze B2 both work, through the same code (B2 exposes an S3-compatible API).

- **Amazon S3:** set `S3_REGION` (for example `us-east-1`) and leave `S3_ENDPOINT` empty.
- **Backblaze B2:** set `S3_ENDPOINT=https://s3.<region>.backblazeb2.com` and `S3_REGION=<region>`, using the region shown on the bucket page. B2 has no egress fees to Cloudflare.

Credentials (`S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`):

- Create a key limited to these two buckets.
- The site needs read access to masters.
- Only the watermark script needs write access.

Previews bucket CORS: allow `GET` from the site's domain.

## 2. Watermarking the catalog (FFmpeg)

```bash
# 1. Dry run: builds previews locally and writes the manifest, uploads nothing
npm run audio:watermark -- --in ./masters --aiff

# 2. Publish: upload masters to the private bucket and previews to the public one
npm run audio:watermark -- --in ./masters --aiff --upload --watermark ./ident.wav
```

For every `.wav`, `.aif`, `.aiff` or `.flac` file in `--in`, the script:

1. **Builds the preview.** It mixes the watermark into the audio every `--every` seconds (default 12, first at 3 s) and encodes a **128 kbps MP3**. The music's level is unchanged, a limiter catches peaks, and metadata is stripped.
   - The file name includes a content hash, so a CDN can cache it forever.
   - Re-running with a new watermark produces new URLs.
2. **Keeps the master untouched.** A WAV is copied as-is; other formats are converted losslessly to 24-bit WAV. With `--aiff`, it also writes a 24-bit AIFF.
3. **Uploads** everything with `--upload`.
4. **Writes `.audio-build/audio-manifest.csv`.** Paste its columns into the Google Sheet:

| Manifest column | Sheet column |
|---|---|
| Audio URL | J · Audio URL (the watermarked preview) |
| Master WAV | Master WAV (new column), e.g. `masters/titan-ascent.wav` |
| Master AIFF | Master AIFF (new column) |

**The watermark.**

- Supply your own voice ident with `--watermark ident.wav`, or set `WATERMARK_FILE`, e.g. a voice saying the brand name.
- It must be shorter than the repeat interval.
- Without one, the script uses a soft built-in two-note chime.
- Tune it with `--every` (5–60 s), `--offset`, `--gain` (dB, default −10) and `--bitrate`.

**FFmpeg.**

- FFmpeg 6.1 comes from the `ffmpeg-static` package, so nothing needs installing.
- To use another build, set `FFMPEG_PATH`.
- The test suite runs the real pipeline and checks that the watermark lands at 3 s, 15 s and 27 s of a 30 s file.

The sheet validation enforces this:

- **Master WAV / Master AIFF** must be object keys, not URLs. A URL would make the master public.
- An **Audio URL** outside `PREVIEW_PUBLIC_BASE_URL` gets a warning.
- The legacy **Full Audio URL** column gets a warning asking you to move that file into the private bucket.

## 3. Accounts: magic-link sign-in

There are no passwords.

1. A user enters their email.
2. `POST /api/auth/request-link` emails a one-time link through Brevo. The link expires in 20 minutes, and each email can request at most 5 links per hour.
3. `GET /api/auth/verify` sets a signed, `httpOnly` session cookie that lasts 30 days.

**Buyers are signed in automatically after checkout.** `GET /api/auth/stripe-return` checks the Checkout Session with Stripe and signs the buyer in as the email they paid with. This only works within 2 hours of checkout.

Implementation details:

- Only a SHA-256 hash of each link token is stored.
- `SESSION_SECRET` (at least 32 characters) signs cookies and receipt links. Changing it signs everyone out.
- The endpoint answers the same way whether or not an account exists, so it can't be used to discover customers.
- Post-login redirects must be same-site paths, which prevents open redirects.
- In development without `BREVO_API_KEY`, the sign-in modal shows the link instead of emailing it.

## 4. The conditional CTA

- **Signed-out visitors:** clicking **Download** or **License & download** opens a modal with two choices:
  - **Subscribe** at the live Stripe price, e.g. "$29/mo". The site reads the price from Stripe, so the displayed price can't drift from the charged price.
  - **Buy a single-track sync license** at the selected tier's price.
  
  The modal also has a "Sign in" link for returning customers.
- **Signed-in users:** the UI checks `GET /api/me` on every page load.
  - With `isSubscribed === true`, every Buy/Download control becomes a direct **Download (WAV/AIFF)**. This applies to table rows, the track page player, the checkout card, the player dock and the stems drawer.
  - Users who already bought a track get the same for that track.
- **The server enforces this too:** `/api/checkout` refuses (409) to charge for a track the user already has access to.

## 5. Downloads

`GET /api/download/:trackId?format=wav|aiff` is the **only** way to get a master.

- It verifies one of these:
  - an active subscription (`active` or `trialing`, with the current period not yet ended);
  - a paid, un-refunded order for that track;
  - a signed receipt link from the purchase email, valid for 14 days and revoked by a refund.
- It enforces a fair-use cap of `DOWNLOAD_DAILY_LIMIT` downloads per user per 24 hours (default 150; 0 = no cap). This stops one subscription from being used to pull down the whole catalog.
- It logs every download to the `downloads` table.
- It redirects to a **60-second signed URL** on the private bucket, served as an attachment.

Receipt emails link to this route, never to the file. Signed-in users can also re-download everything from **/account**.

## 6. Stripe set-up

1. **Products → Add product**: "All-access subscription" with a **recurring** price. Put the `price_…` id in `STRIPE_SUBSCRIPTION_PRICE_ID`.
2. **Settings → Billing → Customer portal**: turn it on. Allow cancelling and updating the payment method. The account menu's "Billing & invoices" button opens it.
3. **Developers → Webhooks → `https://<domain>/api/stripe/webhook`**, with these events:
   - `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - `charge.refunded`

The webhook re-reads each subscription from Stripe instead of trusting the event body, so duplicate or out-of-order events are harmless.

## 7. What this protects against, and what it can't

| Threat | Protection |
|---|---|
| Downloading masters from the browser's Network tab | Masters are never sent to the browser. There are no public URLs, and signed links expire after 60 s and only go to entitled users. |
| Master locations leaking through page HTML | Server-only fields (`masterWavKey`, `masterAiffKey`, `fullAudioUrl`) are removed before any page or API response. A test checks this. |
| A subscriber scraping the entire catalog | Daily download cap and download log |
| Sharing receipt links | Links are signed, expire after 14 days and are revoked by a refund |
| Paying twice | The UI swaps Buy for Download, and the checkout API refuses to charge |

**What it can't prevent.** Anything a browser can play can be recorded, so the **preview can always be captured**. That is why previews are low-bitrate and watermarked: a captured preview is audibly marked and not broadcast quality. Full-quality audio only leaves the private bucket after an authorisation check.

## 8. Rollout checklist

1. `npm run db:migrate` on staging, then production. This applies migration 004: users, subscriptions, login tokens, downloads, and master keys.
2. Create both buckets and set the `S3_*` and `PREVIEW_PUBLIC_BASE_URL` variables in Vercel.
3. Run `npm run audio:watermark -- --in <masters> --aiff --upload`, then paste the manifest into the sheet and set those rows to Status = Ready.
4. Set `SESSION_SECRET`, `STRIPE_SUBSCRIPTION_PRICE_ID` and the webhook events (section 6).
5. Test on staging with Stripe test cards:
   - Subscribe; every Download should work.
   - Cancel in the portal; downloads should stop.
   - Buy one track; only that track should download.
   - Refund it; the download should stop.
