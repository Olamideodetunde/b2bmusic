import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { PostgresRepository } from '../src/lib/db/postgres';
import { FileRepository } from '../src/lib/db/file-store';
import { runMigrations } from '../src/lib/db/migrate';
import { parseCsv } from '../src/lib/ingest/csv';
import type { TrackRepository } from '../src/lib/db/repository';
import { MysqlRepository } from '../src/lib/db/mysql';
import { createMysqlPool } from '../src/lib/db/mysql-pool';
import { runMysqlMigrations } from '../src/lib/db/migrate-mysql';

/** Real Postgres (WASM) with the production migrations applied — verifies the Neon SQL. */
export async function pgliteRepo(): Promise<{ repo: TrackRepository; close: () => Promise<void> }> {
  const db = new PGlite();
  await runMigrations({
    exec: sql => db.exec(sql),
    query: (text, params) => db.query(text, params as any[]) as any,
  });
  return {
    repo: new PostgresRepository({ query: (text, params) => db.query(text, params as any[]) as any }),
    close: () => db.close(),
  };
}

/**
 * Real MySQL / MariaDB with db/migrations-mysql applied, in a throwaway database that is
 * dropped afterwards. Only used when MYSQL_TEST_URL points at a server (no database in
 * the path), e.g. MYSQL_TEST_URL=mysql://root@127.0.0.1:3407 npm test
 */
export async function mysqlRepo(): Promise<{ repo: TrackRepository; close: () => Promise<void> }> {
  const server = (process.env.MYSQL_TEST_URL || '').replace(/\/+$/, '');
  const name = `b2b_test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
  const admin = createMysqlPool(`${server}/`, 1);
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const pool = createMysqlPool(`${server}/${name}`, 2);
  await runMysqlMigrations(pool);
  return {
    repo: new MysqlRepository(pool),
    close: async () => {
      await pool.end();
      await admin.query(`DROP DATABASE \`${name}\``);
      await admin.end();
    },
  };
}

/** Storage backends every repository test runs against. */
export const BACKENDS = [
  ['postgres (PGlite)', pgliteRepo],
  ['file store', fileRepo],
  ...(process.env.MYSQL_TEST_URL ? ([['mysql', mysqlRepo]] as const) : []),
] as const;

/** Local file store pointed at an empty temp file (never touches .data/). */
export async function fileRepo(): Promise<{ repo: TrackRepository; close: () => Promise<void> }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'b2b-test-'));
  const file = path.join(dir, 'db.json');
  await fs.writeFile(file, JSON.stringify({ tracks: [], events: [], orders: [] }));
  process.env.LOCAL_DB_PATH = file;
  return { repo: new FileRepository(), close: () => fs.rm(dir, { recursive: true, force: true }) };
}

/** The client's sample Google Sheet rows (fixtures/sample-track-index.csv). */
export async function sampleRows(): Promise<Record<string, string>[]> {
  return parseCsv(await fs.readFile(path.join(process.cwd(), 'fixtures', 'sample-track-index.csv'), 'utf8'));
}

export const okFetch = (async () => new Response(null, { status: 200, headers: { 'content-type': 'audio/mpeg' } })) as typeof fetch;
export const notFoundFetch = (async () => new Response(null, { status: 404 })) as typeof fetch;
