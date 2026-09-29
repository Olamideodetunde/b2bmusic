import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { getRepository } from '@/lib/db';
import { isLicenseTier, tierInfo } from '@/lib/licensing';
import { sendPurchaseReceiptEmail } from '@/lib/email/brevo';
import { formatPrice, getSiteUrl } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/webhook — Stripe → records the order and emails the license receipt.
 * Configure in Stripe → Developers → Webhooks with events:
 *   checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded
 * Idempotent: Stripe retries are safe (orders are unique per session id).
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text(); // signature is computed over the raw body
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? '', secret);
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid signature: ${err?.message}` }, { status: 400 });
  }

  if (event.type === 'charge.refunded') return handleRefund(event.data.object as Stripe.Charge);

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== 'paid') return NextResponse.json({ received: true, pending: true });

  const trackId = Number(session.metadata?.trackId);
  const tier = session.metadata?.tier;
  if (!Number.isInteger(trackId) || !isLicenseTier(tier)) {
    console.error('[stripe] session missing metadata', session.id);
    return NextResponse.json({ received: true, error: 'missing metadata' });
  }

  const repo = getRepository();
  const track = await repo.findById(trackId);
  const email = session.customer_details?.email ?? null;
  const created = await repo.createOrder({
    stripeSessionId: session.id,
    trackId,
    tier,
    amountCents: session.amount_total ?? 0,
    currency: session.currency ?? 'usd',
    customerEmail: email,
  });

  // Only email on the first delivery of this event.
  if (created && email && track) {
    await sendPurchaseReceiptEmail({
      customerEmail: email,
      trackTitle: track.title,
      tierName: `${tierInfo(tier).name} — ${tierInfo(tier).label}`,
      amount: formatPrice(session.amount_total ?? 0),
      trackUrl: `${getSiteUrl()}/tracks/${track.slug}`,
      downloadUrl: track.fullAudioUrl,
      orderRef: session.id.slice(-12).toUpperCase(),
    });
  }

  return NextResponse.json({ received: true, recorded: created });
}

/** A fully refunded charge marks its order refunded (partial refunds leave the license in place). */
async function handleRefund(charge: Stripe.Charge) {
  if (!charge.refunded) return NextResponse.json({ received: true, partialRefund: true });
  const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntent || !stripe) return NextResponse.json({ received: true, error: 'no payment intent' });

  // Orders are keyed by Checkout Session; look the session up from the payment intent.
  const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 });
  const sessionId = sessions.data[0]?.id;
  if (!sessionId) return NextResponse.json({ received: true, error: 'no checkout session for charge' });

  const updated = await getRepository().markOrderRefunded(sessionId);
  if (updated) console.log(`[stripe] order ${sessionId} refunded`);
  return NextResponse.json({ received: true, refunded: updated });
}
