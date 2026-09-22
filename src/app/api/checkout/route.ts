import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { getTrackBySlug } from '@/lib/db';
import { getSiteUrl } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { slug, tier } = await request.json();

    if (!slug) {
      return NextResponse.json({ error: 'Track slug is required' }, { status: 400 });
    }

    const track = await getTrackBySlug(slug);
    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    let unitAmount = track.standardPriceCents;
    let licenseName = 'Web & Creator Synchronization License';

    if (tier === 'agency') {
      unitAmount = track.agencyPriceCents || 2000;
      licenseName = 'Commercial & Agency Synchronization License (Includes Stems)';
    } else if (tier === 'broadcast') {
      unitAmount = track.broadcastPriceCents;
      licenseName = 'Broadcast, TV & Theatrical Synchronization Buyout';
    }

    const siteUrl = getSiteUrl();

    if (!stripe) {
      // Mock checkout session for dev / testing mode when Stripe key isn't set yet
      return NextResponse.json({
        url: `${siteUrl}/tracks/${track.slug}?checkout_success=true&mock=true&tier=${tier}`,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${track.title} — ${licenseName}`,
              description: `Commercial direct sync license for "${track.title}". Includes 24-bit master WAV, alt-mixes, cue sheet metadata, and YouTube CID clearance.`,
              images: track.coverImageUrl && track.coverImageUrl.startsWith('https://') 
                ? [track.coverImageUrl] 
                : undefined,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/tracks/${track.slug}?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/tracks/${track.slug}?checkout_cancelled=true`,
      metadata: {
        trackId: track.id.toString(),
        trackTitle: track.title,
        trackSlug: track.slug,
        licenseTier: tier,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
