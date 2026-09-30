import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { getRepository } from '@/lib/db';
import { getViewer } from '@/lib/auth/server';
import { getPlan } from '@/lib/stripe/subscriptions';
import { safeNextPath } from '@/lib/auth/session';
import { appOrigin } from '@/lib/auth/origin';
import { readJsonBody } from '@/lib/api/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/subscribe { next? } → { url } (Stripe Checkout, subscription mode).
 * Signing in first is optional: after payment, /api/auth/stripe-return signs the buyer in
 * with the email they used at checkout.
 */
export async function POST(req: Request) {
  const parsed = await readJsonBody(req, 4 * 1024);
  if ('error' in parsed) return parsed.error;
  const next = safeNextPath(parsed.body?.next);

  const plan = await getPlan();
  if (!stripe || !plan) return NextResponse.json({ error: 'Subscriptions are not available yet' }, { status: 503 });

  const viewer = await getViewer();
  if (viewer?.isSubscribed) return NextResponse.json({ error: 'You already have an active subscription' }, { status: 409 });
  const user = viewer ? await getRepository().findUserById(viewer.user.id) : null;

  const origin = appOrigin(req);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: plan.priceId, quantity: 1 }],
      // Reuse the Stripe customer for a returning user; otherwise prefill their email.
      ...(user?.stripeCustomerId ? { customer: user.stripeCustomerId } : user ? { customer_email: user.email } : {}),
      metadata: { purpose: 'subscription', userId: user ? String(user.id) : '' },
      subscription_data: { metadata: { userId: user ? String(user.id) : '' } },
      allow_promotion_codes: true,
      success_url: `${origin}/api/auth/stripe-return?session_id={CHECKOUT_SESSION_ID}&next=${encodeURIComponent(next)}`,
      cancel_url: `${origin}${next}`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[subscribe] Stripe session create failed:', err?.message);
    return NextResponse.json({ error: 'Checkout is temporarily unavailable. Please try again.' }, { status: 502 });
  }
}
