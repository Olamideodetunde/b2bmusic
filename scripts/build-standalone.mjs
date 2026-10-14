/**
 * npm run build:standalone -- --site-url https://example.com
 *
 * Builds the site as a self-contained Node.js app for shared hosting (cPanel "Setup
 * Node.js App") or any plain Node server, and packages it as dist/<name>.zip:
 *
 *   app.js               startup file (cPanel: "Application startup file") → runs server.js
 *   .next/               the app, with its traced dependencies in .next/node_modules
 *   public/              static files
 *   ENVIRONMENT.txt      the variables to set in the host's control panel
 *
 * Dependencies ship in .next/node_modules, not ./node_modules: CloudLinux's Node.js Selector
 * (cPanel) refuses an app root containing node_modules — it owns that name as a symlink to its
 * own virtual environment. The compiled app lives under .next/, so Node's normal lookup (which
 * walks up from the importing file — and is the only lookup ESM `import` uses) finds them;
 * app.js adds the folder to NODE_PATH for server.js, the one file outside .next/. Nothing has
 * to be installed on the server ("Run NPM Install" is not needed).
 *
 * NEXT_PUBLIC_* values are compiled into the pages, so the site URL must be known at
 * build time. Secrets are NOT included: every .env file is removed from the package and
 * the host's environment variables are used at runtime instead.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const siteUrl = (flag('site-url') || '').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(siteUrl)) {
  console.error('Usage: npm run build:standalone -- --site-url https://your-domain.com');
  process.exit(1);
}
const host = new URL(siteUrl).hostname;
const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');
const outDir = path.join(root, 'dist');
const zipPath = path.join(outDir, `${host}-standalone.zip`);

// 1. Build. Explicit env values win over .env.local (which points at localhost).
console.log(`Building for ${siteUrl} …`);
const build = () => {
  fs.rmSync(path.join(root, '.next'), { recursive: true, force: true });
  execSync('npx next build', {
    stdio: 'inherit',
    env: { ...process.env, BUILD_STANDALONE: 'true', NEXT_PUBLIC_SITE_URL: siteUrl, NODE_ENV: 'production' },
  });
};
try {
  build();
} catch {
  // next/font downloads Google Fonts during the build; an occasional bad response from Google
  // crashes it ("Cannot read properties of null"). One retry is usually enough.
  console.log('\nBuild failed — retrying once …\n');
  build();
}

// 2. server.js serves .next/static and public/ itself, but Next doesn't copy them in.
fs.cpSync(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), { recursive: true });
fs.cpSync(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true });

// 3. Never ship local secrets: drop every .env* file the build traced into the bundle.
const removed = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') walk(p);
    } else if (/^\.env(\..*)?$/.test(entry.name)) {
      fs.rmSync(p);
      removed.push(path.relative(standalone, p));
    }
  }
};
walk(standalone);

// 4. CloudLinux owns the name node_modules in the app root (see header): move dependencies to
// .next/node_modules, and start through app.js so server.js (CommonJS) finds them via NODE_PATH.
fs.renameSync(path.join(standalone, 'node_modules'), path.join(standalone, '.next', 'node_modules'));
// app.js also writes startup.log (Node version, errors), since shared hosts often show no logs.
fs.copyFileSync(path.join(root, 'scripts', 'standalone', 'app.js'), path.join(standalone, 'app.js'));
// A package.json without dependencies, so an accidental "Run NPM Install" has nothing to do.
fs.writeFileSync(
  path.join(standalone, 'package.json'),
  `${JSON.stringify({ name: host.replace(/[^a-z0-9-]/g, '-'), private: true, scripts: { start: 'node app.js' } }, null, 2)}\n`,
);

// 5. What the host needs to know.
fs.writeFileSync(
  path.join(standalone, 'ENVIRONMENT.txt'),
  `Built for ${siteUrl} on ${new Date().toISOString()}

Node.js 20 or 22 (not 24). Application startup file: app.js   (do NOT click "Run NPM Install")
Keep the app folder OUTSIDE public_html. Startup problems are written to startup.log in the app folder.
Set these in the hosting control panel (cPanel → Setup Node.js App → Environment variables).
Copy the values from Vercel → Settings → Environment Variables (or your .env.local).

  NODE_ENV=production
  NEXT_PUBLIC_SITE_URL=${siteUrl}
  DATABASE_URL=                 (cPanel MySQL: mysql://USER:PASSWORD@localhost:3306/DATABASE — see docs/mysql.md)
  SESSION_SECRET=
  INGESTION_API_KEY=
  REVALIDATION_SECRET=
  BREVO_API_KEY=
  BREVO_SENDER_EMAIL=
  BREVO_SENDER_NAME=
  BREVO_ADMIN_EMAIL=
  STRIPE_SECRET_KEY=
  STRIPE_WEBHOOK_SECRET=        (create a new webhook endpoint: ${siteUrl}/api/stripe/webhook)
  STRIPE_SUBSCRIPTION_PRICE_ID=
  S3_ACCESS_KEY_ID=
  S3_SECRET_ACCESS_KEY=
  S3_REGION=
  S3_ENDPOINT=
  S3_MASTERS_BUCKET=
  S3_PREVIEWS_BUCKET=
  PREVIEW_PUBLIC_BASE_URL=

Optional: GOOGLE_SITE_VERIFICATION, NEXT_PUBLIC_CONTACT_EMAIL (build-time), AUDIO_URL_CHECK,
DOWNLOAD_DAILY_LIMIT, NOINDEX=true (to keep a test copy out of Google).
Do not set PORT on cPanel — Passenger provides it.
`,
);

// 6. Zip it with bsdtar (built into Windows 10+ as System32\tar.exe; `tar` on macOS). Not GNU
// tar (Git Bash) — it can't write zip — and not PowerShell's Compress-Archive, whose zips can
// carry backslash paths that Linux hosts extract as flat file names.
fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(zipPath, { force: true });
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execSync(`"${tar}" -a -c -f "${zipPath}" -C "${standalone}" .`, { stdio: 'inherit' });

const mb = (fs.statSync(zipPath).size / 1e6).toFixed(1);
console.log(`\n✓ ${path.relative(root, zipPath)} (${mb} MB)`);
if (removed.length) console.log(`  removed from the package: ${removed.join(', ')}`);
console.log('  Upload it, set the variables in ENVIRONMENT.txt, startup file app.js.');
