/**
 * npm run import:sheet -- <track-index.csv> [--api http://localhost:3000] [--dry-run]
 *
 * Bulk-publish test batch / Make.com stand-in. Reads a CSV export of the Google Sheet
 * ("Track Index" tab → File → Download → CSV), sends every row with Status = "Ready" to
 * POST /api/tracks exactly like the Make.com scenario, then writes the sheet with the
 * write-back columns filled in (Status, Live URL, Track ID) to <file>.results.csv.
 *
 * Needs INGESTION_API_KEY in the environment (same key the server uses).
 */
import './env';
import { promises as fs } from 'fs';
import { parseCsv, toCsv } from '../src/lib/ingest/csv';
import { parseTrackRow } from '../src/lib/ingest/parse';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--api');
const api = (flag('--api') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const dryRun = args.includes('--dry-run');

async function main() {
  if (!file) {
    console.error('Usage: npm run import:sheet -- <track-index.csv> [--api http://localhost:3000] [--dry-run]');
    process.exit(1);
  }
  const key = process.env.INGESTION_API_KEY || process.env.INGEST_API_KEY;
  if (!key && !dryRun) {
    console.error('INGESTION_API_KEY is not set (use --dry-run to validate without publishing).');
    process.exit(1);
  }

  const rows = parseCsv(await fs.readFile(file, 'utf8'));
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const ready = rows.filter(r => (r['Status'] ?? '').trim().toLowerCase() === 'ready');
  console.log(`${rows.length} rows · ${ready.length} with Status = Ready · target ${dryRun ? '(dry run)' : api}\n`);

  let ok = 0;
  for (const row of ready) {
    const label = row['Title'] || '(untitled)';

    if (dryRun) {
      const parsed = parseTrackRow(row);
      if (parsed.errors.length) console.log(`  ✗ ${label}\n      ${parsed.errors.map(e => `${e.field}: ${e.message}`).join('\n      ')}`);
      else { ok++; console.log(`  ✓ ${label} — valid`); }
      parsed.warnings.forEach(w => console.log(`      ! ${w}`));
      continue;
    }

    const res = await fetch(`${api}/api/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(row),
    });
    const data: any = await res.json().catch(() => ({ ok: false, errorSummary: `HTTP ${res.status}` }));

    // Same write-back the Make.com scenario performs.
    if (data.ok) {
      ok++;
      row['Status'] = 'Published';
      row['Live URL'] = data.liveUrl;
      row['Track ID'] = String(data.trackId);
      console.log(`  ✓ ${data.action.padEnd(7)} #${data.trackId} ${label} → ${data.liveUrl}`);
    } else {
      row['Status'] = 'Error';
      console.log(`  ✗ ${label} (HTTP ${res.status})\n      ${data.errorSummary}`);
    }
    (data.warnings ?? []).forEach((w: string) => console.log(`      ! ${w}`));
  }

  if (!dryRun) {
    const out = file.replace(/\.csv$/i, '') + '.results.csv';
    await fs.writeFile(out, toCsv(rows, columns));
    console.log(`\nWrote ${out}`);
  }
  console.log(`\n${ok}/${ready.length} rows ${dryRun ? 'valid' : 'published'}.`);
  if (ok < ready.length) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
