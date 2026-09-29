import Stripe from 'stripe';
import { BRAND } from '@/lib/brand';

/** Null when STRIPE_SECRET_KEY isn't configured (checkout then reports "unavailable"). */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: BRAND.wordmark } })
  : null;
