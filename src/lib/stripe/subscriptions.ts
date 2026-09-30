import type Stripe from 'stripe';
import { stripe } from './client';
import type { TrackRepository } from '@/lib/db/repository';
import type { User } from '@/lib/db/types';
import type { Plan } from '@/lib/plan';

export type { Plan };

/**
 * All-access subscription. Create a recurring Product/Price in Stripe and set
 * STRIPE_SUBSCRIPTION_PRICE_ID; the site reads the amount and interval from Stripe,
 * so the price shown can never drift from the price charged.
 */
const PLAN_TTL_MS = 10 * 60_000;
let cached: { plan: Plan | null; at: number } | null = null;

export async function getPlan(): Promise<Plan | null> {
  const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  if (!stripe || !priceId) return null;
  if (cached && Date.now() - cached.at < PLAN_TTL_MS) return cached.plan;
  try {
    const price = await stripe.prices.retrieve(priceId);
    const plan: Plan | null =
      price.active && price.recurring && price.unit_amount !== null
        ? {
            priceId: price.id,
            amountCents: price.unit_amount,
            currency: price.currency,
            interval: price.recurring.interval,
            intervalCount: price.recurring.interval_count,
          }
        : null;
    if (!plan) console.error(`[stripe] STRIPE_SUBSCRIPTION_PRICE_ID ${priceId} is not an active recurring price`);
    cached = { plan, at: Date.now() };
    return plan;
  } catch (err: any) {
    console.error('[stripe] could not load subscription price:', err?.message);
    cached = { plan: null, at: Date.now() - PLAN_TTL_MS + 60_000 }; // retry in a minute
    return null;
  }
}

/** Finds the site user behind a Stripe customer, creating/linking one by email if needed. */
export async function userForCustomer(repo: TrackRepository, customerId: string, emailHint?: string | null): Promise<User | null> {
  const existing = await repo.findUserByStripeCustomer(customerId);
  if (existing) return existing;
  let email = emailHint ?? null;
  if (!email && stripe) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) email = customer.email;
  }
  return email ? repo.upsertUser(email, customerId) : null;
}

/**
 * Mirrors one subscription from Stripe into the database. Always re-reads Stripe
 * (the source of truth), so duplicated or out-of-order webhook events are harmless.
 */
export async function syncSubscription(repo: TrackRepository, subscriptionId: string, emailHint?: string | null): Promise<void> {
  if (!stripe) return;
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const user = await userForCustomer(repo, customerId, emailHint);
  if (!user) {
    console.error(`[stripe] subscription ${sub.id}: no email for customer ${customerId}`);
    return;
  }
  const item = sub.items.data[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  // current_period_end moved from the subscription to its items in newer Stripe API versions.
  const periodEnd = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end ?? item?.current_period_end;
  await repo.upsertSubscription({
    stripeSubscriptionId: sub.id,
    userId: user.id,
    status: sub.status,
    priceId: item?.price?.id ?? null,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  });
}
