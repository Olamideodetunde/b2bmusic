import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { isLicenseTier, tierInfo } from '@/lib/licensing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/checkout/session?session_id=cs_… — lets the track page confirm a purchase
 * with Stripe instead of trusting a "?success=true" query string.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('session_id') ?? '';
  if (!stripe || !/^cs_[A-Za-z0-9_]+$/.test(id)) {
    return NextResponse.json({ paid: false }, { status: 400 });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    const tier = session.metadata?.tier;
    return NextResponse.json({
      paid: session.payment_status === 'paid',
      slug: session.metadata?.slug ?? null,
      tierName: isLicenseTier(tier) ? tierInfo(tier).name : null,
      // Only reveal a masked address to whoever holds the session id.
      email: session.customer_details?.email?.replace(/^(.).*(@.*)$/, '$1•••$2') ?? null,
    });
  } catch {
    return NextResponse.json({ paid: false }, { status: 404 });
  }
}
