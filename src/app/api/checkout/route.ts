import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { getTrackBySlug } from '@/lib/db';
import { isLicenseTier, tierInfo, tierPriceCents } from '@/lib/licensing';
import { getSiteUrl, absoluteUrl } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout { slug, tier } → { url } (Stripe Checkout).
 * The price always comes from the database, never from the browser.
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { slug, tier } = body ?? {};
  if (typeof slug !== 'string' || !isLicenseTier(tier)) {
    return NextResponse.json({ error: 'Unknown track or license tier' }, { status: 400 });
  }

  const track = await getTrackBySlug(slug);
  if (!track) return NextResponse.json({ error: 'Track not found' }, { status: 404 });

  if (!stripe) {
    // Local development without Stripe keys: let the UI show a clearly-labelled demo state.
    const demo = process.env.NODE_ENV !== 'production';
    return NextResponse.json(
      { error: 'Checkout is not configured', demo },
      { status: 503 },
    );
  }

  const info = tierInfo(tier);
  const siteUrl = getSiteUrl();
  const coverUrl = track.coverImageUrl ? absoluteUrl(track.coverImageUrl, siteUrl) : undefined;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: tierPriceCents(track, tier),
            product_data: {
              name: `${track.title} — ${info.name} License`,
              description: `${info.label}: ${info.summary}`,
              images: coverUrl ? [coverUrl] : undefined,
              metadata: { trackId: String(track.id) },
            },
          },
        },
      ],
      metadata: { trackId: String(track.id), slug: track.slug, tier },
      customer_creation: 'if_required',
      allow_promotion_codes: true,
      success_url: `${siteUrl}/tracks/${track.slug}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/tracks/${track.slug}?checkout=cancelled`,
    });
  } catch (err: any) {
    // Stripe rejected the request (bad key, invalid image URL, outage…). Log the detail
    // server-side; the buyer gets a clean, retryable message instead of a raw 500.
    console.error('[checkout] Stripe session create failed:', err?.type ?? '', err?.message ?? err);
    return NextResponse.json({ error: 'Checkout is temporarily unavailable. Please try again.' }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
