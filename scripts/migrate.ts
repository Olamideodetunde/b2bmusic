/**
 * npm run db:migrate — creates/updates the schema in DATABASE_URL.
 *   Postgres (Neon):   applies db/migrations/*.sql
 *   MySQL / MariaDB:   applies db/migrations-mysql/*.sql   (DATABASE_URL=mysql://…)
 * Run once per environment and after each release that adds a migration. Idempotent.
 */
import './env';
import { Client } from 'pg';
import { runMigrations } from '../src/lib/db/migrate';
import { runMysqlMigrations } from '../src/lib/db/migrate-mysql';
import { createMysqlPool, isMysqlUrl } from '../src/lib/db/mysql-pool';

const log = (msg: string) => console.log(`  ✓ ${msg}`);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Use the Neon *direct* (non-pooled) connection string, or mysql://user:pass@host/db.');
    process.exit(1);
  }

  let applied: string[];
  if (isMysqlUrl(url)) {
    const pool = createMysqlPool(url, 1);
    try {
      applied = await runMysqlMigrations(pool, log);
    } finally {
      await pool.end();
    }
  } else {
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
      applied = await runMigrations(
        { exec: sql => client.query(sql), query: (text, params) => client.query(text, params as any[]) as any },
        log,
      );
    } finally {
      await client.end();
    }
  }
  console.log(applied.length ? `Applied ${applied.length} migration(s).` : 'Database is up to date.');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
