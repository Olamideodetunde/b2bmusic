import Stripe from 'stripe';

/** Null when STRIPE_SECRET_KEY isn't configured (checkout then reports "unavailable"). */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: 'B2BProductionMusic' } })
  : null;
