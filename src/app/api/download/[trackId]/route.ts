import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import type { DownloadVia, MasterFormat } from '@/lib/db/types';
import { getViewer } from '@/lib/auth/server';
import { dailyDownloadLimit, downloadAccess } from '@/lib/auth/access';
import { verifyToken } from '@/lib/auth/session';
import { appOrigin } from '@/lib/auth/origin';
import type { ReceiptTokenPayload } from '@/lib/stripe/orders';
import { isStorageConfigured, signedMasterUrl } from '@/lib/storage/s3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Failure = 'sign_in_required' | 'license_required' | 'not_found' | 'master_unavailable' | 'limit_reached' | 'storage_unavailable' | 'link_expired';

const STATUS: Record<Failure, number> = {
  sign_in_required: 401,
  license_required: 403,
  link_expired: 403,
  not_found: 404,
  master_unavailable: 404,
  limit_reached: 429,
  storage_unavailable: 503,
};
const MESSAGES: Record<Failure, string> = {
  sign_in_required: 'Sign in to download the master.',
  license_required: 'Subscribe or license this track to download the master.',
  link_expired: 'This download link has expired. Sign in with your purchase email to download again.',
  not_found: 'Track not found.',
  master_unavailable: 'The master file for this track is not available yet — contact licensing.',
  limit_reached: 'Daily download limit reached. Try again tomorrow or contact licensing.',
  storage_unavailable: 'Downloads are temporarily unavailable.',
};

/**
 * GET /api/download/:trackId?format=wav|aiff
 *
 * The ONLY way to reach a full-quality master. Authorised by one of:
 *   - an active subscription (whole catalog)          → session cookie
 *   - a paid, un-refunded license for this track      → session cookie
 *   - a signed receipt link from the purchase email   → ?token=…
 * On success it logs the download and redirects to a 60-second signed URL on the private
 * bucket. `?mode=json` returns { url } instead, for the in-page Download buttons.
 */
export async function GET(req: Request, { params }: { params: { trackId: string } }) {
  const url = new URL(req.url);
  const json = url.searchParams.get('mode') === 'json';
  const format: MasterFormat = url.searchParams.get('format') === 'aiff' ? 'aiff' : 'wav';
  const trackId = Number(params.trackId);

  const repo = getRepository();
  const track = Number.isInteger(trackId) && trackId > 0 ? await repo.findById(trackId) : null;

  const fail = (reason: Failure) => {
    if (json || !track) return NextResponse.json({ error: reason, message: MESSAGES[reason] }, { status: STATUS[reason], headers: { 'Cache-Control': 'no-store' } });
    // A browser following an email link: send them to the track page, which explains.
    const back = new URL(`/tracks/${track.slug}`, appOrigin(req));
    back.searchParams.set('download', reason);
    return NextResponse.redirect(back, 303);
  };

  if (!track || !track.isPublished) return fail('not_found');

  // ── Who is asking, and why may they have it? ──
  let via: DownloadVia | null = null;
  let userId: number | null = null;
  let email: string | null = null;

  const token = url.searchParams.get('token');
  if (token) {
    const receipt = verifyToken<ReceiptTokenPayload>(token);
    if (!receipt || receipt.kind !== 'receipt' || receipt.tid !== trackId) return fail('link_expired');
    // A refund revokes the license, even for links already sent.
    if (!(await repo.purchasedTrackIds(receipt.email)).includes(trackId)) return fail('license_required');
    via = 'receipt';
    email = receipt.email;
    userId = (await repo.findUserByEmail(receipt.email))?.id ?? null;
  } else {
    const viewer = await getViewer();
    if (!viewer) return fail('sign_in_required');
    via = downloadAccess(viewer, trackId);
    if (!via) return fail('license_required');
    userId = viewer.user.id;
    email = viewer.user.email;
  }

  // ── Fair-use limit (stops a single account from scraping the catalog) ──
  const limit = dailyDownloadLimit();
  if (userId !== null && limit > 0 && (await repo.countDownloadsSince(userId, new Date(Date.now() - 24 * 3600_000))) >= limit) {
    return fail('limit_reached');
  }

  // ── Resolve the master ──
  const key = format === 'aiff' ? track.masterAiffKey : track.masterWavKey;
  let target: string | null = null;
  if (key) {
    if (!isStorageConfigured('masters')) return fail('storage_unavailable');
    target = await signedMasterUrl(key, `${track.slug}.${format}`);
  } else if (format === 'wav' && track.fullAudioUrl) {
    target = track.fullAudioUrl; // legacy tracks not yet migrated to the private bucket
  }
  if (!target) return fail('master_unavailable');

  await repo.logDownload({ userId, email, trackId, format, via });

  if (json) return NextResponse.json({ url: target, via }, { headers: { 'Cache-Control': 'no-store' } });
  const res = NextResponse.redirect(target, 302);
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}
