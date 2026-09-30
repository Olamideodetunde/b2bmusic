import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { getRepository } from '@/lib/db';
import { recordPaidCheckout } from '@/lib/stripe/orders';
import { syncSubscription } from '@/lib/stripe/subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/webhook — Stripe → orders, subscriptions, refunds.
 * Configure in Stripe → Developers → Webhooks with these events:
 *   checkout.session.completed, checkout.session.async_payment_succeeded
 *   customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
 *   charge.refunded
 * Idempotent: orders are unique per session id, and subscriptions are re-read from Stripe.
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

  const repo = getRepository();
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription') {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (subId) await syncSubscription(repo, subId, session.customer_details?.email);
        return NextResponse.json({ received: true, subscription: subId ?? null });
      }
      if (session.payment_status !== 'paid') return NextResponse.json({ received: true, pending: true });
      const recorded = await recordPaidCheckout(repo, session);
      return NextResponse.json({ received: true, recorded });
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(repo, sub.id);
      return NextResponse.json({ received: true, subscription: sub.id });
    }

    case 'charge.refunded':
      return handleRefund(event.data.object as Stripe.Charge);

    default:
      return NextResponse.json({ received: true, ignored: event.type });
  }
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
