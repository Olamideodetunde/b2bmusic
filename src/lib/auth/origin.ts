import { getSiteUrl } from '@/lib/utils';

/**
 * Origin for links and redirects we generate. Production always uses the canonical
 * site URL (never the request's Host header, which a client controls); development
 * uses the request's own origin so links work on whatever port `next dev` picked.
 */
export function appOrigin(req: Request): string {
  return process.env.NODE_ENV === 'production' ? getSiteUrl() : new URL(req.url).origin;
}

/**
 * CSRF guard for cookie-authenticated POSTs (sign-in link, logout, subscribe, billing,
 * checkout): the browser's Origin header must be this site. Requests without an Origin
 * (same-origin navigations in older browsers, server-to-server) fall back to
 * Sec-Fetch-Site, which modern browsers always send.
 */
export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return req.headers.get('sec-fetch-site') !== 'cross-site';
  return origin === appOrigin(req) || origin === new URL(req.url).origin;
}
