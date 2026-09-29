/**
 * Loads .env.local (then .env) for CLI scripts, the same files `next dev` reads.
 * Variables already set in the shell win, so `DATABASE_URL=… npm run db:migrate` still works.
 */
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file); // Node ≥ 20.12; never overrides existing variables
  } catch {
    // file absent — fine
  }
}
