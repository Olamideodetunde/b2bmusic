import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { getRepository } from '@/lib/db';
import { safeNextPath } from '@/lib/auth/session';
import { signIn } from '@/lib/auth/server';
import { appOrigin } from '@/lib/auth/origin';
import { syncSubscription } from '@/lib/stripe/subscriptions';
import { recordPaidCheckout } from '@/lib/stripe/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A checkout can sign its buyer in only shortly after it was created. */
const RETURN_WINDOW_MS = 2 * 3600_000;

/**
 * GET /api/auth/stripe-return?session_id=cs_…&next=… — Stripe's success redirect.
 *
 * Verifies the Checkout Session with Stripe (never trusting the URL), signs the buyer in
 * as the email they paid with, and — for subscriptions — records the subscription right
 * away so access is instant even if the webhook arrives a few seconds later.
 * The session id is an unguessable secret only the buyer's browser receives.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = appOrigin(req);
  const next = safeNextPath(url.searchParams.get('next'));
  const id = url.searchParams.get('session_id') ?? '';
  const fail = () => NextResponse.redirect(new URL(next, origin), 303);

  if (!stripe || !/^cs_[A-Za-z0-9_]+$/.test(id)) return fail();

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(id);
  } catch {
    return fail();
  }
  const complete = session.status === 'complete' && (session.payment_status === 'paid' || session.payment_status === 'no_payment_required');
  const fresh = Date.now() - session.created * 1000 < RETURN_WINDOW_MS;
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  if (!complete || !fresh || !email) return fail();

  const repo = getRepository();
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
  const user = await repo.upsertUser(email, customerId);

  const dest = new URL(next, origin);
  if (session.mode === 'subscription' && session.subscription) {
    const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
    await syncSubscription(repo, subId, email).catch(err => console.error('[stripe-return] sync failed:', err?.message));
    dest.searchParams.set('subscribed', '1');
  } else {
    // Single-track license: record it now (idempotent with the webhook) so the buyer's
    // Download button works immediately; the track page confirms from the session id.
    await recordPaidCheckout(repo, session).catch(err => console.error('[stripe-return] order failed:', err?.message));
    dest.searchParams.set('checkout', 'success');
    dest.searchParams.set('session_id', session.id);
  }
  return signIn(NextResponse.redirect(dest, 303), user);
}
