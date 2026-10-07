import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { getRepository } from '@/lib/db';
import { safeNextPath } from '@/lib/auth/session';
import { getViewer } from '@/lib/auth/server';
import { appOrigin } from '@/lib/auth/origin';
import { issueLoginLink } from '@/lib/auth/links';
import { syncSubscription } from '@/lib/stripe/subscriptions';
import { recordPaidCheckout } from '@/lib/stripe/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Only recent checkouts are processed here (the webhook handles anything later). */
const RETURN_WINDOW_MS = 2 * 3600_000;

/**
 * GET /api/auth/stripe-return?session_id=cs_…&next=… — Stripe's success redirect.
 *
 * Verifies the Checkout Session with Stripe (never trusting the URL) and records the
 * order / subscription right away, so access is instant even if the webhook is late.
 *
 * It does NOT sign the browser in as the checkout email: that address is typed by the
 * buyer at Stripe and unverified, so trusting it would let anyone buy a $10 track as
 * victim@example.com and take over that account. Instead:
 *   - already signed in as the paying email → continue, everything is unlocked;
 *   - otherwise → a one-time sign-in link is emailed to the paying address.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = appOrigin(req);
  const next = safeNextPath(url.searchParams.get('next'));
  const id = url.searchParams.get('session_id') ?? '';
  const back = () => NextResponse.redirect(new URL(next, origin), 303);

  if (!stripe || !/^cs_[A-Za-z0-9_]+$/.test(id)) return back();

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(id);
  } catch {
    return back();
  }
  const complete = session.status === 'complete' && (session.payment_status === 'paid' || session.payment_status === 'no_payment_required');
  const fresh = Date.now() - session.created * 1000 < RETURN_WINDOW_MS;
  const email = (session.customer_details?.email ?? session.customer_email ?? '').trim().toLowerCase();
  if (!complete || !fresh || !email) return back();

  const repo = getRepository();
  const dest = new URL(next, origin);
  if (session.mode === 'subscription' && session.subscription) {
    const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
    await syncSubscription(repo, subId, email).catch(err => console.error('[stripe-return] sync failed:', err?.message));
    dest.searchParams.set('subscribed', '1');
  } else {
    // Single-track license (idempotent with the webhook); the track page confirms from the session id.
    await recordPaidCheckout(repo, session).catch(err => console.error('[stripe-return] order failed:', err?.message));
    dest.searchParams.set('checkout', 'success');
    dest.searchParams.set('session_id', session.id);
  }

  const viewer = await getViewer();
  if (viewer?.user.email.toLowerCase() !== email) {
    // Not signed in as the buyer: prove the inbox before anything is unlocked in this browser.
    const link = await issueLoginLink(origin, email, safeNextPath(dest.pathname + dest.hash));
    dest.searchParams.set('signin', link.ok ? 'check_email' : 'email_failed');
    if (link.ok && link.devLink) dest.searchParams.set('dev_link', link.devLink);
  }
  return NextResponse.redirect(dest, 303);
}
