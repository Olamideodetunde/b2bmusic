import { promises as fs } from 'fs';
import path from 'path';
import type { Queryable } from './postgres';

export interface MigrationTarget extends Queryable {
  /** Runs a multi-statement SQL script. */
  exec(sql: string): Promise<unknown>;
}

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

/**
 * Applies db/migrations/*.sql in filename order, once each, recording them in
 * schema_migrations. Safe to run on every deploy. Used by `npm run db:migrate`
 * and by the test suite (against PGlite).
 */
export async function runMigrations(db: MigrationTarget, log: (msg: string) => void = () => {}): Promise<string[]> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  const { rows } = await db.query<{ filename: string }>('SELECT filename FROM schema_migrations');
  const done = new Set(rows.map(r => r.filename));
  const files = (await fs.readdir(MIGRATIONS_DIR)).filter(f => f.endsWith('.sql')).sort();

  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    await db.exec('BEGIN');
    try {
      await db.exec(sql);
      await db.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await db.exec('COMMIT');
    } catch (err) {
      await db.exec('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
    applied.push(file);
    log(`applied ${file}`);
  }
  return applied;
}
