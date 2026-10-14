import mysql from 'mysql2/promise';

/** True for mysql://… and mariadb://… connection strings. */
export function isMysqlUrl(url: string | undefined): boolean {
  return /^(mysql|mariadb):\/\//i.test(url ?? '');
}

/**
 * Pool for a MySQL / MariaDB DATABASE_URL, e.g.
 *   mysql://cpaneluser_b2b:PASSWORD@localhost:3306/cpaneluser_b2bmusic
 * URL-encode special characters in the password (@ → %40, # → %23, / → %2F).
 * Add ?ssl=true for a remote server that requires TLS.
 *
 * Everything is UTC: mysql2 reads/writes DATETIME as UTC (`timezone: 'Z'`) and each new
 * connection sets the session time zone, so CURRENT_TIMESTAMP is UTC as well.
 */
export function createMysqlPool(url: string, connectionLimit = 5): mysql.Pool {
  const parsed = new URL(url.replace(/^mariadb:/i, 'mysql:'));
  const pool = mysql.createPool({
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    ssl: parsed.searchParams.get('ssl') === 'true' ? { rejectUnauthorized: true } : undefined,
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    connectionLimit,
    waitForConnections: true,
    enableKeepAlive: true,
  });
  pool.pool.on('connection', (conn: { query: (sql: string) => unknown }) => {
    conn.query("SET time_zone = '+00:00'");
  });
  return pool;
}
