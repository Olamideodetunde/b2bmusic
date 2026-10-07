import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth/server';
import { getPlan } from '@/lib/stripe/subscriptions';
import { getRepository } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/me — who is signed in and what they can download. The UI uses this to swap
 * "Buy" buttons for "Download" for subscribers and existing license holders.
 * `plan` (the subscription price) is included for everyone, signed in or not.
 */
export async function GET() {
  const [viewer, plan] = await Promise.all([getViewer(), getPlan()]);
  const account = viewer ? await getRepository().findUserById(viewer.user.id) : null;
  return NextResponse.json(
    {
      user: viewer ? { email: viewer.user.email } : null,
      isSubscribed: viewer?.isSubscribed ?? false,
      hasBillingAccount: Boolean(account?.stripeCustomerId),
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
