import type { Subscription, User, DownloadVia } from '@/lib/db/types';
import type { TrackRepository } from '@/lib/db/repository';

/**
 * Stripe statuses that unlock the catalog. `past_due` is deliberately excluded:
 * Stripe keeps retrying the card, and access returns automatically on success.
 */
export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

export function isSubscriptionActive(sub: Subscription, now = Date.now()): boolean {
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(sub.status)) return false;
  // Belt and braces: never honour a period that has already ended, even if a
  // cancellation webhook was missed.
  return !sub.currentPeriodEnd || Date.parse(sub.currentPeriodEnd) > now;
}

export interface Viewer {
  user: Pick<User, 'id' | 'email'>;
  subscription: Subscription | null;
  isSubscribed: boolean;
  purchasedTrackIds: number[];
}

/** Loads everything the UI and the download route need to know about a signed-in user. */
export async function loadViewer(repo: TrackRepository, session: { uid: number; email: string }): Promise<Viewer | null> {
  const user = await repo.findUserById(session.uid);
  // A session for a deleted user, or one whose email no longer matches, is not honoured.
  if (!user || user.email.toLowerCase() !== session.email.toLowerCase()) return null;
  const [subs, purchasedTrackIds] = await Promise.all([repo.listSubscriptions(user.id), repo.purchasedTrackIds(user.email)]);
  const active = subs.find(s => isSubscriptionActive(s)) ?? null;
  return {
    user: { id: user.id, email: user.email },
    subscription: active ?? subs[0] ?? null,
    isSubscribed: Boolean(active),
    purchasedTrackIds,
  };
}

/**
 * Why (if at all) this viewer may download the master of `trackId`.
 * A subscription covers the whole catalog; a single-track license covers that track.
 */
export function downloadAccess(
  viewer: Pick<Viewer, 'isSubscribed' | 'purchasedTrackIds'> | null,
  trackId: number,
): Exclude<DownloadVia, 'receipt'> | null {
  if (!viewer) return null;
  if (viewer.isSubscribed) return 'subscription';
  if (viewer.purchasedTrackIds.includes(trackId)) return 'purchase';
  return null;
}

/** Fair-use cap on master downloads per user per 24h (anti-scraping). 0 disables the cap. */
export function dailyDownloadLimit(): number {
  const n = Number(process.env.DOWNLOAD_DAILY_LIMIT ?? 150);
  return Number.isFinite(n) && n >= 0 ? n : 150;
}
