import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes('ep-sample-123456')) {
    console.log('No live DATABASE_URL provided. The application is running in local fallback mode.');
    return;
  }

  console.log('Connecting to Neon Serverless Postgres...');
  const sql = neon(connectionString);

  console.log('Applying database schema from src/lib/db/schema.sql...');
  const schemaSql = fs.readFileSync(path.resolve('src/lib/db/schema.sql'), 'utf-8');
  
  // Split statements and execute
  await sql(schemaSql);
  console.log('Schema applied successfully!');
}

main().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
