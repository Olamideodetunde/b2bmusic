/**
 * Brevo (formerly Sendinblue) Transactional Email Client
 */

interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
}

export async function sendTransactionalEmail({ to, subject, htmlContent }: SendEmailParams) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "licensing@b2bproductionmusic.com";
  const senderName = process.env.BREVO_SENDER_NAME || "B2B Production Music";

  if (!apiKey) {
    console.log(`[Brevo Mock Email] To: ${to.map(t => t.email).join(', ')} | Subject: ${subject}`);
    return { success: true, mocked: true };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        "Accept": "application/json"
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to,
        subject,
        htmlContent
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Brevo Error]:", errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (err: any) {
    console.error("[Brevo Request Failed]:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send alert when a new track is ingested and published automatically
 */
export async function sendPublishAlertEmail(trackTitle: string, slug: string, liveUrl: string) {
  const adminEmail = process.env.BREVO_ADMIN_EMAIL || "admin@b2bproductionmusic.com";
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0d0d14; color: #ffffff; border: 1px solid #222; border-radius: 12px;">
      <h2 style="color: #ef4444; margin-top: 0;">🚀 New Track Published Programmatically</h2>
      <p style="color: #d1d5db;">A new track has been ingested from Google Sheets / Make.com and published live with Next.js ISR.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; color: #ffffff;">
        <tr><td style="padding: 10px; font-weight: bold; width: 140px; border-bottom: 1px solid #222; color: #9ca3af;">Track Title:</td><td style="padding: 10px; border-bottom: 1px solid #222;"><strong>${trackTitle}</strong></td></tr>
        <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #222; color: #9ca3af;">Slug:</td><td style="padding: 10px; border-bottom: 1px solid #222;"><code style="color: #ef4444;">${slug}</code></td></tr>
        <tr><td style="padding: 10px; font-weight: bold; color: #9ca3af;">Live URL:</td><td style="padding: 10px;"><a href="${liveUrl}" style="color: #ef4444; text-decoration: underline;">${liveUrl}</a></td></tr>
      </table>
      <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #222; font-size: 12px; color: #6b7280;">
        B2BProductionMusic.com · Programmatic Landing Page Infrastructure
      </div>
    </div>
  `;

  return sendTransactionalEmail({
    to: [{ email: adminEmail, name: "Catalog Admin" }],
    subject: `[Published] ${trackTitle} is now live on B2BProductionMusic.com`,
    htmlContent
  });
}

/**
 * Send purchase confirmation & license certificate
 */
export async function sendPurchaseReceiptEmail(customerEmail: string, trackTitle: string, licenseTier: string, downloadUrl: string) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0d0d14; color: #ffffff; border: 1px solid #222; border-radius: 12px;">
      <h2 style="color: #ef4444; margin-top: 0;">🎉 Commercial Music License Confirmed</h2>
      <p style="color: #d1d5db;">Thank you for licensing commercial audio from <strong>B2BProductionMusic.com</strong>.</p>
      <div style="background-color: #14141f; padding: 18px; border-radius: 8px; margin: 20px 0; border: 1px solid #2d2d3d;">
        <p style="margin: 0 0 10px 0; color: #ffffff;"><strong>Track:</strong> ${trackTitle}</p>
        <p style="margin: 0 0 10px 0; color: #ef4444;"><strong>License Tier:</strong> ${licenseTier}</p>
        <p style="margin: 0; color: #9ca3af; font-size: 13px;"><strong>Rights Granted:</strong> 100% Pre-Cleared Worldwide Perpetual Synchronization with automatic YouTube Content ID whitelisting.</p>
      </div>
      <a href="${downloadUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">Download Master Audio & Stems</a>
      <p style="margin-top: 25px; font-size: 12px; color: #6b7280;">Need an official cue sheet or custom sync indemnification agreement? Reply directly to this email.</p>
    </div>
  `;

  return sendTransactionalEmail({
    to: [{ email: customerEmail }],
    subject: `Your Commercial License: ${trackTitle} (B2BProductionMusic.com)`,
    htmlContent
  });
}
