# Running on MySQL / MariaDB

The site runs on **Postgres (Neon)** or **MySQL / MariaDB**. It picks the database from
`DATABASE_URL`:

| `DATABASE_URL` | Database | Schema files |
|---|---|---|
| `mysql://…` or `mariadb://…` | MySQL 5.7+ / 8.x, MariaDB 10.3+ | `db/migrations-mysql/` |
| anything else (`postgres://…`) | Postgres 14+ (Neon) | `db/migrations/` |
| unset | local JSON file (development only) | — |

Use MySQL when the host only offers MySQL, as most cPanel shared hosting does, or when it
blocks outbound connections to Neon on port 5432.

## 1. Create the database (cPanel)

1. Go to **cPanel → MySQL® Databases**.
2. **Create New Database**, for example `b2bmusic`. cPanel adds your account prefix, so it
   becomes something like `cpuser_b2bmusic`.
3. **Add New User** with a long generated password, for example `cpuser_b2bapp`.
4. **Add User To Database**, then tick **ALL PRIVILEGES**.

The site's `DATABASE_URL` is then:

```
mysql://cpuser_b2bapp:PASSWORD@localhost:3306/cpuser_b2bmusic
```

- **Password characters:** URL-encode special characters in the password:
  - `@` → `%40`
  - `#` → `%23`
  - `/` → `%2F`
  - `:` → `%3A`
  - `%` → `%25`
- **TLS:** add `?ssl=true` only when connecting to a remote server that requires TLS.
- **Host:** use `localhost` when the app runs on the same hosting account.

## 2. Create the tables and copy your data

### Shared hosting: phpMyAdmin import (easiest)

1. On your computer, generate one import file containing the tables and all current data
   from Neon:

   ```bash
   npm run db:copy-to-mysql -- --from "postgres://…neon…" --sql-file mysql-import.sql
   ```

   Use the Neon connection string from `.env.local` or Vercel. The script only reads from
   Neon. The file keeps the same IDs, so Track IDs in the sheet, live URLs and purchases
   stay valid.
2. Go to **cPanel → phpMyAdmin**, click the new (empty) database on the left, then
   **Import** → choose `mysql-import.sql` → **Import**.
3. Delete `mysql-import.sql` from your computer afterwards. It contains customer emails.

To start empty instead, import `db/migrations-mysql/001_schema.sql` the same way.

### Directly into a MySQL server you can reach

```bash
npm run db:copy-to-mysql -- --from "postgres://…neon…" --to "mysql://…"
```

This creates the tables and copies every row. It refuses to copy into a database that
already has data, so it can't duplicate or overwrite a live database. On cPanel, your IP
must first be allowed under **Remote MySQL®**, and you use the server's hostname instead of
`localhost`.

Both ways copy:

- tracks;
- users;
- the publish log;
- orders;
- subscriptions;
- the download log;
- sign-in links that haven't expired.

New IDs continue after the highest copied one.

## 3. Later schema changes

When a release adds a file to `db/migrations-mysql/`, apply it with either:

- **phpMyAdmin:** Import that one file.
- **The migration command:** where Node and the project source are available, run
  `DATABASE_URL="mysql://…" npm run db:migrate`. It's safe to re-run, and it records what it
  applied in `schema_migrations`.

## 4. Switch the app

1. Set `DATABASE_URL` to the MySQL URL in the host's environment variables.
2. Restart the app.
3. Open `/api/health`. It should report `"storage":"mysql"` and the published track count.

## Notes

- **Times:** stored in UTC as `DATETIME(3)`. The app sets the connection's time zone itself,
  so the server's time zone doesn't matter.
- **Text comparisons:** `utf8mb4_unicode_ci` makes email and keyword comparisons
  case-insensitive, the same as Postgres's `lower(…)` checks. Emails are stored lower-cased.
- **Backups:** use cPanel → **Backup** → *Download a MySQL Database Backup*, or
  `mysqldump`.
  - `npm run db:restore` and the `db/backups/neon-*.json` snapshots are Postgres-only.
- **Tests:** run the full suite against a MySQL/MariaDB server as well:

  ```bash
  MYSQL_TEST_URL=mysql://root@127.0.0.1:3306 npm test
  ```

  Each run creates and then drops its own `b2b_test_*` database. Use a server you don't use
  for real data.
