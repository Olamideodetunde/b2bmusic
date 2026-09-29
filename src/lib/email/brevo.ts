/**
 * Brevo transactional email: purchase confirmations and publish alerts.
 *
 * Env: BREVO_API_KEY, BREVO_SENDER_EMAIL (must be on the Brevo-verified domain),
 *      BREVO_SENDER_NAME, BREVO_ADMIN_EMAIL (who receives publish alerts; BREVO_ALERT_EMAIL also works).
 * Without BREVO_API_KEY, emails are logged instead of sent (local development).
 */

interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
}

export type SendResult = { success: true; mocked?: boolean } | { success: false; error: string };

/** Everything interpolated into email HTML comes from the sheet or Stripe — escape it. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendTransactionalEmail({ to, subject, htmlContent }: SendEmailParams): Promise<SendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'licensing@b2bproductionmusic.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'B2B Production Music';

  if (!apiKey) {
    console.log(`[brevo:mock] to=${to.map(t => t.email).join(',')} subject="${subject}"`);
    return { success: true, mocked: true };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey, Accept: 'application/json' },
      body: JSON.stringify({ sender: { name: senderName, email: senderEmail }, to, subject, htmlContent }),
      // Never let a slow email provider stall a Make.com run or a Stripe webhook.
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      const error = await response.text();
      console.error('[brevo] send failed:', response.status, error);
      return { success: false, error: `HTTP ${response.status}` };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[brevo] request failed:', err?.message);
    return { success: false, error: err?.message ?? 'request failed' };
  }
}

// ─── Templates ──────────────────────────────────────────────────────

function layout(heading: string, body: string) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:28px;background:#0b0b0f;color:#f8fafc;border:1px solid #1e1e2b;border-radius:12px">
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#71718a;margin-bottom:18px">B2B Production Music</div>
    <h2 style="margin:0 0 16px;font-size:20px;color:#ffffff">${heading}</h2>
    ${body}
    <div style="margin-top:28px;padding-top:14px;border-top:1px solid #1e1e2b;font-size:12px;color:#71718a">
      B2BProductionMusic.com · Direct sync licensing
    </div>
  </div>`;
}

function rows(items: [string, string][]) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${items
    .map(([k, v]) => `<tr><td style="padding:9px 0;color:#a1a1ba;width:140px;border-bottom:1px solid #1e1e2b">${k}</td><td style="padding:9px 0;border-bottom:1px solid #1e1e2b;color:#ffffff">${v}</td></tr>`)
    .join('')}</table>`;
}

function alertRecipient() {
  const email = process.env.BREVO_ADMIN_EMAIL || process.env.BREVO_ALERT_EMAIL;
  return email ? [{ email, name: 'Catalog Admin' }] : null;
}

/** Sent after every successful create/update from the sheet. */
export async function sendPublishAlertEmail(p: { title: string; slug: string; liveUrl: string; action: 'created' | 'updated'; trackId: number; warnings: string[] }) {
  const to = alertRecipient();
  if (!to) return { success: true, mocked: true } as SendResult;
  const warnings = p.warnings.length
    ? `<p style="margin:16px 0 0;color:#fbbf24;font-size:13px"><strong>Check:</strong><br>${p.warnings.map(escapeHtml).join('<br>')}</p>`
    : '';
  return sendTransactionalEmail({
    to,
    subject: `[${p.action === 'created' ? 'Published' : 'Updated'}] ${p.title}`,
    htmlContent: layout(
      p.action === 'created' ? 'New track published' : 'Track updated',
      rows([
        ['Track', `<strong>${escapeHtml(p.title)}</strong>`],
        ['Track ID', escapeHtml(p.trackId)],
        ['URL', `<a href="${escapeHtml(p.liveUrl)}" style="color:#f87171">${escapeHtml(p.liveUrl)}</a>`],
      ]) + warnings,
    ),
  });
}

/** Sent when the API rejects a row, so a failure is visible even if Make.com's write-back fails. */
export async function sendPublishFailureEmail(p: { title: string; errorSummary: string }) {
  const to = alertRecipient();
  if (!to || process.env.BREVO_ALERT_ON_ERROR === 'false') return { success: true, mocked: true } as SendResult;
  return sendTransactionalEmail({
    to,
    subject: `[Publish error] ${p.title || 'Untitled row'}`,
    htmlContent: layout(
      'A sheet row could not be published',
      rows([['Track', escapeHtml(p.title || '—')], ['Problem', escapeHtml(p.errorSummary)]]) +
        '<p style="margin:16px 0 0;color:#a1a1ba;font-size:13px">Fix the row in the Google Sheet and set Status back to <strong>Ready</strong>.</p>',
    ),
  });
}

/** Purchase confirmation + license summary, sent from the Stripe webhook. */
export async function sendPurchaseReceiptEmail(p: {
  customerEmail: string;
  trackTitle: string;
  tierName: string;
  amount: string;
  trackUrl: string;
  downloadUrl?: string;
  orderRef: string;
}) {
  const download = p.downloadUrl
    ? `<a href="${escapeHtml(p.downloadUrl)}" style="display:inline-block;margin-top:20px;background:#dc2626;color:#ffffff;padding:12px 22px;text-decoration:none;border-radius:999px;font-weight:bold">Download licensed audio</a>`
    : `<p style="margin:20px 0 0;color:#a1a1ba;font-size:13px">Your licensed files will follow in a separate email from our licensing team.</p>`;
  return sendTransactionalEmail({
    to: [{ email: p.customerEmail }],
    subject: `Your license: ${p.trackTitle} (${p.tierName})`,
    htmlContent: layout(
      'License confirmed',
      rows([
        ['Track', `<a href="${escapeHtml(p.trackUrl)}" style="color:#f87171">${escapeHtml(p.trackTitle)}</a>`],
        ['License', escapeHtml(p.tierName)],
        ['Amount', escapeHtml(p.amount)],
        ['Order ref', `<code>${escapeHtml(p.orderRef)}</code>`],
      ]) +
        '<p style="margin:16px 0 0;color:#a1a1ba;font-size:13px">Perpetual, worldwide synchronization license for one project, 100% pre-cleared (master and publishing), with YouTube Content ID whitelisting.</p>' +
        download,
    ),
  });
}
