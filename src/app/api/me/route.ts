import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth/server';
import { getPlan } from '@/lib/stripe/subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/me — who is signed in and what they can download. The UI uses this to swap
 * "Buy" buttons for "Download" for subscribers and existing license holders.
 * `plan` (the subscription price) is included for everyone, signed in or not.
 */
export async function GET() {
  const [viewer, plan] = await Promise.all([getViewer(), getPlan()]);
  return NextResponse.json(
    {
      user: viewer ? { email: viewer.user.email } : null,
      isSubscribed: viewer?.isSubscribed ?? false,
      subscription: viewer?.subscription
        ? {
            status: viewer.subscription.status,
            currentPeriodEnd: viewer.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: viewer.subscription.cancelAtPeriodEnd,
          }
        : null,
      purchasedTrackIds: viewer?.purchasedTrackIds ?? [],
      plan,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
