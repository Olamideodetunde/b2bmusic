/**
 * npm run db:migrate — applies db/migrations/*.sql to DATABASE_URL.
 * Run once per environment (staging branch, production branch) and after each release
 * that adds a migration. Idempotent.
 */
import './env';
import { Client } from 'pg';
import { runMigrations } from '../src/lib/db/migrate';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Use the Neon *direct* (non-pooled) connection string for migrations.');
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const applied = await runMigrations(
      { exec: sql => client.query(sql), query: (text, params) => client.query(text, params as any[]) as any },
      msg => console.log(`  ✓ ${msg}`),
    );
    console.log(applied.length ? `Applied ${applied.length} migration(s).` : 'Database is up to date.');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
