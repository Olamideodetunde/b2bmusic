import type Stripe from 'stripe';
import type { TrackRepository } from '@/lib/db/repository';
import { isLicenseTier, tierInfo } from '@/lib/licensing';
import { sendPurchaseReceiptEmail } from '@/lib/email/brevo';
import { formatPrice, getSiteUrl } from '@/lib/utils';
import { signToken } from '@/lib/auth/session';

/** Receipt download links stay valid this long (the account page works indefinitely). */
export const RECEIPT_LINK_TTL_S = 14 * 24 * 3600;

export interface ReceiptTokenPayload {
  kind: 'receipt';
  tid: number;
  email: string;
  exp: number;
}

export function receiptDownloadUrl(trackId: number, email: string): string {
  const token = signToken({ kind: 'receipt', tid: trackId, email: email.toLowerCase(), exp: Math.floor(Date.now() / 1000) + RECEIPT_LINK_TTL_S });
  return `${getSiteUrl()}/api/download/${trackId}?token=${encodeURIComponent(token)}`;
}

/**
 * Records a paid single-track Checkout Session and emails the receipt — exactly once,
 * whether it's reached first by the Stripe webhook or by the buyer's success redirect.
 * Returns true when this call created the order.
 */
export async function recordPaidCheckout(repo: TrackRepository, session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.mode !== 'payment' || session.payment_status !== 'paid') return false;
  const trackId = Number(session.metadata?.trackId);
  const tier = session.metadata?.tier;
  if (!Number.isInteger(trackId) || !isLicenseTier(tier)) {
    console.error('[stripe] session missing metadata', session.id);
    return false;
  }

  const email = session.customer_details?.email ?? null;
  const created = await repo.createOrder({
    stripeSessionId: session.id,
    trackId,
    tier,
    amountCents: session.amount_total ?? 0,
    currency: session.currency ?? 'usd',
    customerEmail: email,
  });

  const track = created && email ? await repo.findById(trackId) : null;
  if (created && email && track) {
    const hasMaster = Boolean(track.masterWavKey || track.fullAudioUrl);
    await sendPurchaseReceiptEmail({
      customerEmail: email,
      trackTitle: track.title,
      tierName: `${tierInfo(tier).name} — ${tierInfo(tier).label}`,
      amount: formatPrice(session.amount_total ?? 0),
      trackUrl: `${getSiteUrl()}/tracks/${track.slug}`,
      // A signed, expiring link to the protected download route — never the file's real location.
      downloadUrl: hasMaster ? receiptDownloadUrl(track.id, email) : undefined,
      orderRef: session.id.slice(-12).toUpperCase(),
    });
  }
  return created;
}
