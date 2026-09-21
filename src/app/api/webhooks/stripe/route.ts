import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { sendPurchaseReceiptEmail } from '@/lib/email/brevo';

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret || !sig) {
    return NextResponse.json({ received: true, simulated: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const customerEmail = session.customer_details?.email;
    const trackTitle = session.metadata?.trackTitle || 'Licensed Production Track';
    const tier = session.metadata?.licenseTier === 'broadcast' 
      ? 'Full Buyout & Broadcast TV ($40)' 
      : session.metadata?.licenseTier === 'agency'
        ? 'Broadcast & Sync with Stems ($20)'
        : 'Web & Social Perpetual ($10)';
    
    // In production, generate a signed S3/R2 download URL for the master files
    const downloadUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/downloads/${session.metadata?.trackSlug || 'licensed'}`;

    if (customerEmail) {
      await sendPurchaseReceiptEmail(customerEmail, trackTitle, tier, downloadUrl);
    }
  }

  return NextResponse.json({ received: true });
}
