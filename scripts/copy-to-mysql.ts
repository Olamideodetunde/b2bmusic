/**
 * One-off move from Postgres (Neon) to MySQL / MariaDB, keeping the same IDs so Track IDs
 * in the sheet, live URLs, orders and accounts stay valid. Reads the source only.
 *
 *   Straight into a MySQL server you can reach:
 *     npm run db:copy-to-mysql -- --from "postgres://…neon…" --to "mysql://user:pass@host:3306/db"
 *     Creates the schema (db/migrations-mysql) and copies every row. Refuses to run if the
 *     target already has data, so it can't overwrite or duplicate a live database.
 *
 *   As a .sql file for phpMyAdmin → Import (shared hosting, no remote MySQL access):
 *     npm run db:copy-to-mysql -- --from "postgres://…neon…" --sql-file mysql-import.sql
 *     The file creates the tables and inserts the data; import it into an EMPTY database.
 *
 * Expired sign-in links are not copied.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { Client } from 'pg';
import mysql from 'mysql2/promise';
import { createMysqlPool, isMysqlUrl } from '../src/lib/db/mysql-pool';
import { runMysqlMigrations, splitStatements } from '../src/lib/db/migrate-mysql';

// Parents before children, so foreign keys are satisfied as rows arrive.
const TABLES = ['tracks', 'users', 'publish_events', 'orders', 'subscriptions', 'login_tokens', 'downloads'] as const;
type Table = (typeof TABLES)[number];
const WHERE: Partial<Record<Table, string>> = { login_tokens: 'expires_at > now()' };
const NO_NUMERIC_ID = new Set<Table>(['subscriptions', 'login_tokens']);
const SCHEMA_DIR = path.join(process.cwd(), 'db', 'migrations-mysql');

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

/** Postgres values → what the MySQL columns expect. */
function toMysql(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v !== 'object') return v;
  return JSON.stringify(v); // TEXT[] arrays and JSONB objects → JSON columns
}

/** Column names per table, read from the MySQL schema files (so both modes copy the same columns). */
async function schemaColumns(): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const file of (await fs.readdir(SCHEMA_DIR)).filter(f => f.endsWith('.sql')).sort()) {
    for (const stmt of splitStatements(await fs.readFile(path.join(SCHEMA_DIR, file), 'utf8'))) {
      const m = stmt.match(/^CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*)\)[^)]*$/i);
      if (!m) continue;
      out[m[1]] = m[2]
        .split('\n')
        .map(l => l.trim().match(/^(\w+)\s+(?!KEY\b)[A-Z]/)?.[1])
        .filter((c): c is string => !!c && !/^(PRIMARY|UNIQUE|KEY|CONSTRAINT|INDEX)$/i.test(c));
    }
  }
  return out;
}

async function readSource(from: string, columns: Record<string, string[]>) {
  const pg = new Client({ connectionString: from });
  await pg.connect();
  try {
    const data: Partial<Record<Table, Record<string, unknown>[]>> = {};
    for (const table of TABLES) {
      const cols = columns[table];
      if (!cols?.length) throw new Error(`No columns found for ${table} in ${SCHEMA_DIR}`);
      const { rows } = await pg.query(`SELECT ${cols.map(c => `"${c}"`).join(', ')} FROM ${table}${WHERE[table] ? ` WHERE ${WHERE[table]}` : ''}`);
      data[table] = rows;
    }
    return data as Record<Table, Record<string, unknown>[]>;
  } finally {
    await pg.end();
  }
}

const insertSql = (table: string, cols: string[]) =>
  `INSERT INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;

async function copyToServer(to: string, columns: Record<string, string[]>, data: Record<Table, Record<string, unknown>[]>) {
  const my = createMysqlPool(to, 1);
  try {
    await runMysqlMigrations(my, msg => console.log(`  ✓ ${msg}`));
    for (const table of TABLES) {
      const [[{ n }]] = (await my.query(`SELECT COUNT(*) AS n FROM \`${table}\``)) as any;
      if (Number(n) > 0) throw new Error(`Target table ${table} already has ${n} row(s) — refusing to copy into a database that is in use.`);
    }
    const conn = await my.getConnection();
    try {
      await conn.beginTransaction();
      for (const table of TABLES) {
        for (const row of data[table]) await conn.query(insertSql(table, columns[table]), columns[table].map(c => toMysql(row[c])));
        console.log(`  ${table}: ${data[table].length} row(s)`);
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    // New rows continue after the highest copied ID (like the Postgres sequences). After the
    // commit, because ALTER TABLE would implicitly commit the copy half-way.
    for (const table of TABLES) {
      if (NO_NUMERIC_ID.has(table)) continue;
      const [[{ next }]] = (await my.query(`SELECT COALESCE(MAX(id), 0) + 1 AS next FROM \`${table}\``)) as any;
      await my.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = ${Number(next)}`);
    }
  } finally {
    await my.end();
  }
  console.log('Done. Point DATABASE_URL at the MySQL database and restart the app.');
}

async function writeSqlFile(file: string, columns: Record<string, string[]>, data: Record<Table, Record<string, unknown>[]>) {
  const fmt = (sql: string, values: unknown[]) => mysql.format(sql, values as any[], false, 'Z');
  const out: string[] = [
    `-- Global B2B Audio Holding — MySQL import generated ${new Date().toISOString()}`,
    '-- phpMyAdmin: select the EMPTY database → Import → choose this file → Import.',
    "SET NAMES utf8mb4;",
    "SET time_zone = '+00:00';",
    '',
  ];
  for (const f of (await fs.readdir(SCHEMA_DIR)).filter(f => f.endsWith('.sql')).sort()) {
    out.push(...splitStatements(await fs.readFile(path.join(SCHEMA_DIR, f), 'utf8')).map(s => `${s};`), '');
  }
  out.push(
    'CREATE TABLE IF NOT EXISTS schema_migrations (filename VARCHAR(191) NOT NULL PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    ...(await fs.readdir(SCHEMA_DIR)).filter(f => f.endsWith('.sql')).sort().map(f => fmt('INSERT IGNORE INTO schema_migrations (filename) VALUES (?);', [f])),
    '',
  );
  for (const table of TABLES) {
    out.push(`-- ${table}: ${data[table].length} row(s)`);
    for (const row of data[table]) out.push(`${fmt(insertSql(table, columns[table]), columns[table].map(c => toMysql(row[c])))};`);
    if (!NO_NUMERIC_ID.has(table)) {
      const max = Math.max(0, ...data[table].map(r => Number(r.id) || 0));
      out.push(`ALTER TABLE \`${table}\` AUTO_INCREMENT = ${max + 1};`);
    }
    out.push('');
  }
  await fs.writeFile(file, out.join('\n'), 'utf8');
  for (const table of TABLES) console.log(`  ${table}: ${data[table].length} row(s)`);
  console.log(`Wrote ${file}. Import it into an EMPTY MySQL database (phpMyAdmin → Import).`);
}

async function main() {
  const from = arg('from');
  const to = arg('to');
  const sqlFile = arg('sql-file');
  if (!from || isMysqlUrl(from) || (!to && !sqlFile) || (to && !isMysqlUrl(to))) {
    console.error('Usage: npm run db:copy-to-mysql -- --from <postgres url> (--to <mysql url> | --sql-file <out.sql>)');
    process.exit(1);
  }
  const columns = await schemaColumns();
  const data = await readSource(from, columns);
  if (to) await copyToServer(to, columns, data);
  else await writeSqlFile(sqlFile!, columns, data);
}

main().catch(err => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
