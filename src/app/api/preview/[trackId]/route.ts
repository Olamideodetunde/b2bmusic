import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { playablePreviewUrl } from '@/lib/storage/preview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/preview/:trackId[?mix=<altMixId>] — plays a published track's watermarked preview.
 *
 * Pages only contain this path, never the storage URL. Each request is answered with a
 * short-lived signed link (the previews bucket can then be private), so preview links can't
 * be scraped from the HTML, shared, or hot-linked. Masters are never served here — they are
 * only reachable through /api/download, after a purchase or with a subscription.
 */

// Per-visitor limit: plenty for listening and seeking, not for bulk-downloading the catalog.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 90;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(req: Request): boolean {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip');
  if (!ip) return false; // no client address from the proxy: never throttle everyone as one visitor
  const now = Date.now();
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

export async function GET(req: Request, { params }: { params: { trackId: string } }) {
  // Another website embedding our audio (hot-linking) — browsers mark those requests cross-site.
  if (req.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  if (rateLimited(req)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } });
  }

  const id = Number(params.trackId);
  if (!Number.isInteger(id) || id <= 0 || id > 2_147_483_647) return notFound();
  const track = await getRepository().findById(id);
  if (!track?.isPublished) return notFound();

  const mixId = new URL(req.url).searchParams.get('mix');
  const source = mixId ? track.altMixes?.find(m => m.id === mixId)?.audioUrl : track.previewAudioUrl;
  if (!source) return notFound();

  const target = await playablePreviewUrl(source);
  return NextResponse.redirect(target.startsWith('/') ? new URL(target, req.url) : target, {
    status: 302,
    headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' },
  });
}
