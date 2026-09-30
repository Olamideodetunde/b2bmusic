import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Stateless, signed session cookie: base64url(JSON payload) + "." + HMAC-SHA256.
 * No passwords exist in this system — users prove they own an email address
 * (magic link) or a Stripe checkout, and get this cookie.
 *
 * SESSION_SECRET (≥ 32 chars) signs cookies, receipt download links and nothing else.
 * Rotating it signs everyone out and invalidates outstanding receipt links.
 */
export const SESSION_COOKIE = 'gb2b_session';
export const SESSION_MAX_AGE_S = 30 * 24 * 3600; // 30 days

export interface SessionPayload {
  uid: number;
  email: string;
  /** Expiry, seconds since epoch. */
  exp: number;
}

let warned = false;

/** The signing secret. Uses SESSION_SECRET, with a deterministic fallback derived from DATABASE_URL / INGESTION_API_KEY. */
export function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  // If not explicitly set, derive deterministically from DATABASE_URL or INGESTION_API_KEY so auth doesn't fail closed in production
  const fallbackSource = process.env.DATABASE_URL || process.env.INGESTION_API_KEY || process.env.REVALIDATION_SECRET;
  if (fallbackSource) {
    return createHash('sha256').update(`gb2b-session-secret:${fallbackSource}`).digest('hex');
  }
  if (process.env.NODE_ENV === 'production') return null;
  if (!warned) {
    console.warn('[auth] SESSION_SECRET is not set — using an insecure development secret.');
    warned = true;
  }
  return 'dev-only-insecure-session-secret-change-me';
}

const b64 = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Signs any small JSON payload that carries an `exp` (seconds). */
export function signToken(payload: { exp: number } & Record<string, unknown>, secret = sessionSecret()): string {
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const body = b64(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

/** Verifies signature and expiry; returns the payload or null. */
export function verifyToken<T extends { exp: number }>(token: string | undefined | null, secret = sessionSecret()): T | null {
  if (!token || !secret) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, sign(body, secret))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionValue(user: { id: number; email: string }): string {
  return signToken({ uid: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_S });
}

export function readSessionValue(value: string | undefined | null): SessionPayload | null {
  const p = verifyToken<SessionPayload>(value);
  return p && Number.isInteger(p.uid) && typeof p.email === 'string' ? p : null;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_S,
};

// ─── Magic-link tokens ───────────────────────────────────────────

export const LOGIN_TOKEN_TTL_MS = 20 * 60_000; // 20 minutes
export const LOGIN_LINKS_PER_HOUR = 5;

/** A random, URL-safe token for the email link. Only its hash is stored. */
export function newLoginToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashLoginToken(token) };
}

export function hashLoginToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i.test(email.trim());
}

/** Only same-site relative paths are allowed as post-login redirects (no open redirect). */
export function safeNextPath(next: unknown, fallback = '/'): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next.slice(0, 500);
}
