/**
 * npm run db:restore -- db/backups/neon-<timestamp>.json [--table tracks] [--into tracks_restored]
 *
 * Loads a table from a JSON backup into a NEW table in DATABASE_URL. It never touches the
 * live table: inspect the restored copy first, then swap it in with the SQL in
 * docs/cutover.md (Rollback). For a full-database rollback, Neon's point-in-time restore
 * (Branches → Restore) is faster.
 */
import './env';
import { promises as fs } from 'fs';
import { Client } from 'pg';
import { restoreTable, type BackupFile } from '../src/lib/db/restore';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = process.argv.slice(2).find(a => a.endsWith('.json'));
  if (!file) {
    console.error('Usage: npm run db:restore -- <backup.json> [--table tracks] [--into <new_table>]');
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const backup = JSON.parse(await fs.readFile(file, 'utf8')) as BackupFile;
  const table = arg('table') ?? 'tracks';
  const stamp = backup.takenAt.replace(/\D/g, '').slice(0, 12);
  const into = arg('into') ?? `${table}_restored_${stamp}`;

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const n = await restoreTable(
      { exec: sql => client.query(sql), query: (text, params) => client.query(text, params as any[]) as any },
      backup,
      table,
      into,
    );
    console.log(`Restored ${n} row(s) from ${file} (taken ${backup.takenAt}) into "${into}".`);
    console.log(`Inspect it: SELECT id, slug, title FROM ${into} ORDER BY id;`);
    console.log('Then follow docs/cutover.md → Rollback to swap it in.');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
