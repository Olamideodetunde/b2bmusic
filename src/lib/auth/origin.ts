import { getSiteUrl } from '@/lib/utils';

/**
 * Origin for links and redirects we generate. Production always uses the canonical
 * site URL (never the request's Host header, which a client controls); development
 * uses the request's own origin so links work on whatever port `next dev` picked.
 */
export function appOrigin(req: Request): string {
  return process.env.NODE_ENV === 'production' ? getSiteUrl() : new URL(req.url).origin;
}
