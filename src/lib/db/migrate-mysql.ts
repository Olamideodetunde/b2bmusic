import { promises as fs } from 'fs';
import path from 'path';
import type { MysqlQueryable } from './mysql';

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations-mysql');

/** Splits a migration into statements: each ends with ";" at the end of a line. Comment lines are dropped. */
export function splitStatements(sql: string): string[] {
  return sql
    .split('\n')
    .filter(line => !/^\s*--/.test(line))
    .join('\n')
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Applies db/migrations-mysql/*.sql in filename order, once each, recording them in
 * schema_migrations — the MySQL counterpart of runMigrations().
 *
 * MySQL commits DDL implicitly, so a migration can't be rolled back as a unit: every
 * statement is written to be re-runnable (CREATE TABLE IF NOT EXISTS …), and a file is
 * only recorded once all its statements succeeded, so a failed run can simply be re-run.
 */
export async function runMysqlMigrations(db: MysqlQueryable, log: (msg: string) => void = () => {}): Promise<string[]> {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(191) NOT NULL PRIMARY KEY,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const [rows] = await db.query('SELECT filename FROM schema_migrations');
  const done = new Set((rows as { filename: string }[]).map(r => r.filename));
  const files = (await fs.readdir(MIGRATIONS_DIR)).filter(f => f.endsWith('.sql')).sort();

  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const statements = splitStatements(await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8'));
    for (const [i, statement] of statements.entries()) {
      try {
        await db.query(statement);
      } catch (err) {
        throw new Error(`Migration ${file} failed at statement ${i + 1}: ${(err as Error).message}`);
      }
    }
    await db.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
    applied.push(file);
    log(`applied ${file}`);
  }
  return applied;
}
