# Make.com scenario — Sheet → API → write-back

This scenario publishes every Google Sheet row whose **Status = Ready**, then writes the result back to the same row. Build it once for **staging** (pointing at the staging URL and key) and clone it for **production**.

```
[1] Google Sheets: Search Rows (Status = Ready)
        │  one bundle per row
[2] JSON: Create JSON  (safe escaping of descriptions)
        │
[3] HTTP: Make a request  → POST /api/tracks
        │
[4] Router
     ├─ ok = true  → [5] Google Sheets: Update a Row  (Status=Published, Live URL, Track ID)
     └─ otherwise  → [6] Google Sheets: Update a Row  (Status=Error [, Last Error])
```

**Operation cost:** roughly 4 operations per row (search is shared). A 500-row bulk publish uses about 2,000 operations, which is why the proposal recommends a paid plan: the free tier's ~1,000 operations a month isn't enough.

---

## Before you start

- **The API key:** the same value as `INGESTION_API_KEY` in Vercel. Store it in a Make.com **data store** or as a scenario variable, not pasted into each module.
- **The sheet:** row 1 must contain the headers exactly as in the master index: `Title … Track ID`.
- **Duration format:** set column F to **Format → Number → Plain text**, so `2:45` stays text.

## [1] Google Sheets › Search Rows

| Setting | Value |
|---|---|
| Spreadsheet / Sheet | the master index / `Track Index` |
| Table contains headers | **Yes** |
| Column range | `A-Q` |
| Filter | `Status` · *Equal to* · `Ready` |
| Maximum number of returned rows | `50` (per run; the schedule picks up the rest) |

> ⚠️ **Filter on `Ready`, never on `Published`.** *Published* is what the scenario writes back after success, not the trigger. Watching *Published* reprocesses edited rows and is how duplicate pages get created (see the sheet's "How to use" tab).

**Schedule:** every 15 minutes, or run on demand during bulk publishing. Search Rows is used instead of "Watch Rows" because Watch Rows only sees *new* rows. An edited row that goes back to *Ready* would be missed.

## [2] JSON › Create JSON

Create a data structure named **Track Row** with these text fields:
`Title, Target Keyword, Genre, BPM, Musical Key, Duration, Description, Moods, Use Cases, Audio URL, Cover Image URL, Standard Price, Commercial Price, Broadcast Price, Status, Track ID`

Map each field from module [1]. For example, `Title` ← `1. Title`.

> Why a JSON module instead of typing JSON into the HTTP body: descriptions contain quotes and commas, and hand-built JSON breaks on them. Create JSON escapes everything correctly.

## [3] HTTP › Make a request

| Setting | Value |
|---|---|
| URL | `https://<site>/api/tracks` |
| Method | `POST` |
| Headers | `Authorization` = `Bearer {{API key}}` |
| Body type | Raw |
| Content type | `JSON (application/json)` |
| Request content | `{{2.JSON string}}` |
| Parse response | **Yes** |
| Timeout | `40` seconds |
| Evaluate all states as errors | **No** (422/409 responses carry the error message the router needs) |

**Error handler** (right-click the module → *Add error handler*): add **Break**, with *Automatically complete execution* = Yes, *Number of attempts* = 3 and *Interval* = 5 minutes. This retries network failures and 5xx responses. Retries are safe: a create that already succeeded is matched by title + keyword and updated, never duplicated.

## [4] Router

- **Route A** filter: `3. Data: ok` · *Boolean: Equal to* · `true`
- **Route B** filter: *(no filter; set as the fallback route)*

## [5] Google Sheets › Update a Row (Route A — success)

| Setting | Value |
|---|---|
| Row number | `1. Row number` |
| Status (O) | `{{3.data.status}}` → *Published* |
| Live URL (P) | `{{3.data.liveUrl}}` |
| Track ID (Q) | `{{3.data.trackId}}` |

Leave every other column empty in this module, so the client's data isn't overwritten.

## [6] Google Sheets › Update a Row (Route B — failure)

| Setting | Value |
|---|---|
| Row number | `1. Row number` |
| Status (O) | `Error` |
| Last Error (R, optional) | `{{3.data.errorSummary}}` |

Leave Track ID and Live URL untouched. An update that fails keeps its existing ID and URL.

---

## Testing the scenario

1. On **staging**, add a test row with a deliberately bad Genre (e.g. `Polka`) and set it to Ready. Run once. **Expected:** Status = Error, with the reason in the alert email or the Last Error column.
2. Fix the Genre and set Ready again. **Expected:** Status = Published, and Live URL and Track ID are filled. The page opens at that URL within seconds.
3. Change the Standard Price and set Ready again. **Expected:** the same Track ID and URL, and the page shows the new price.
4. Run the scenario twice in a row with no Ready rows. **Expected:** nothing happens (zero HTTP calls).
5. Check `GET /api/publish-log` (with the API key) to confirm each call was recorded.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Every row → `401 Unauthorized` | The Authorization header must be exactly `Bearer <key>`, and the key must match Vercel's `INGESTION_API_KEY` for that environment |
| Every row → `503 … INGESTION_API_KEY is missing` | The key isn't set in Vercel (or is < 24 chars) for that environment. Redeploy after setting it |
| `audioUrl: Audio URL returned HTTP 404` | The MP3 link is wrong or not public. Open it in a private browser window |
| `targetKeyword: … already targeted by track #…` | Two rows use the same keyword. Give one of them a different search-intent keyword |
| `trackId: Track ID … does not exist` | The Track ID was edited or copied from another row. Restore the original value |
| Duplicate pages appearing | The Search Rows filter is watching *Published* instead of *Ready* |
| Page not updated after "Published" | Hard-refresh. If it persists, `POST /api/revalidate {"trackId": <id>}` |
