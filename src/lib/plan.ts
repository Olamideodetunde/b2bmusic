/** The all-access subscription plan, as read from Stripe (see src/lib/stripe/subscriptions.ts). Client-safe. */
export interface Plan {
  priceId: string;
  amountCents: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
}

/** "$29/mo", "$290/yr", "$15 every 3 months". */
export function formatPlan(plan: Plan): string {
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: plan.currency.toUpperCase(),
    minimumFractionDigits: plan.amountCents % 100 === 0 ? 0 : 2,
  }).format(plan.amountCents / 100);
  const unit = { day: 'day', week: 'wk', month: 'mo', year: 'yr' }[plan.interval];
  return plan.intervalCount === 1 ? `${amount}/${unit}` : `${amount} every ${plan.intervalCount} ${plan.interval}s`;
}
