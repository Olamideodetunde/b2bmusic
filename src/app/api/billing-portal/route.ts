import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { getRepository } from '@/lib/db';
import { getViewer } from '@/lib/auth/server';
import { appOrigin } from '@/lib/auth/origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/billing-portal → { url } — Stripe's hosted page for cards, invoices and cancelling. */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const user = await getRepository().findUserById(viewer.user.id);
  if (!stripe || !user?.stripeCustomerId) return NextResponse.json({ error: 'No billing account yet' }, { status: 404 });
  try {
    const portal = await stripe.billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${appOrigin(req)}/account` });
    return NextResponse.json({ url: portal.url });
  } catch (err: any) {
    console.error('[billing-portal]', err?.message);
    return NextResponse.json({ error: 'Billing portal is unavailable. Please try again.' }, { status: 502 });
  }
}
