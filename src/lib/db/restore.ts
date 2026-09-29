import type { MigrationTarget } from './migrate';

/** Shape written to db/backups/neon-<timestamp>.json. */
export interface BackupFile {
  takenAt: string;
  tables: Record<string, { columns: { column_name: string; data_type: string }[]; rows: Record<string, unknown>[] }>;
}

const SAFE_IDENT = /^[a-z_][a-z0-9_]{0,62}$/;
const TYPES: Record<string, string> = {
  boolean: 'BOOLEAN',
  integer: 'INTEGER',
  bigint: 'BIGINT',
  numeric: 'NUMERIC',
  text: 'TEXT',
  'character varying': 'TEXT',
  jsonb: 'JSONB',
  json: 'JSONB',
  'timestamp with time zone': 'TIMESTAMPTZ',
  'timestamp without time zone': 'TIMESTAMP',
  date: 'DATE',
};

function ident(name: string): string {
  if (!SAFE_IDENT.test(name)) throw new Error(`Unsafe SQL identifier: ${JSON.stringify(name)}`);
  return `"${name}"`;
}

/**
 * Restores one table from a backup into a NEW table (it refuses to write into a table
 * that already exists), so a restore can be inspected before anything live changes.
 * Swapping it in is a separate, deliberate step — see docs/cutover.md.
 */
export async function restoreTable(
  db: MigrationTarget,
  backup: BackupFile,
  sourceTable: string,
  targetTable: string,
): Promise<number> {
  const data = backup.tables[sourceTable];
  if (!data) throw new Error(`Backup has no table "${sourceTable}" (has: ${Object.keys(backup.tables).join(', ')})`);

  const { rows: existing } = await db.query<{ exists: boolean }>(
    'SELECT to_regclass($1) IS NOT NULL AS exists',
    [`public.${targetTable}`],
  );
  if (existing[0]?.exists) throw new Error(`Table "${targetTable}" already exists — pick a new --into name`);

  const cols = data.columns.map(c => {
    const type = TYPES[c.data_type];
    if (!type) throw new Error(`Unsupported column type "${c.data_type}" on ${c.column_name}`);
    return { name: c.column_name, type };
  });

  await db.exec('BEGIN');
  try {
    await db.exec(`CREATE TABLE ${ident(targetTable)} (${cols.map(c => `${ident(c.name)} ${c.type}`).join(', ')})`);
    const placeholders = cols.map((c, i) => `$${i + 1}${c.type === 'JSONB' ? '::jsonb' : ''}`).join(', ');
    const insert = `INSERT INTO ${ident(targetTable)} (${cols.map(c => ident(c.name)).join(', ')}) VALUES (${placeholders})`;
    for (const row of data.rows) {
      const values = cols.map(c => {
        const v = row[c.name];
        return c.type === 'JSONB' && v !== null && v !== undefined ? JSON.stringify(v) : v ?? null;
      });
      await db.query(insert, values);
    }
    await db.exec('COMMIT');
  } catch (err) {
    await db.exec('ROLLBACK');
    throw err;
  }
  return data.rows.length;
}
