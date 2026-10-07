import { getRepository } from '@/lib/db';
import { sendLoginLinkEmail } from '@/lib/email/brevo';
import { LOGIN_LINKS_PER_HOUR, LOGIN_TOKEN_TTL_MS, newLoginToken } from './session';

export type LoginLinkResult =
  | { ok: true; devLink?: string }
  | { ok: false; status: 429 | 503 | 502; error: string };

/**
 * Creates a one-time sign-in token for `email` and emails the link to that address.
 *
 * Proving you can read an inbox is the ONLY way to become a user here, so the link is
 * never handed back to the requester in production. In local development (no Brevo key)
 * it is returned as `devLink` so sign-in can be tested without email.
 */
export async function issueLoginLink(origin: string, email: string, next: string): Promise<LoginLinkResult> {
  const repo = getRepository();
  const recent = await repo.countLoginTokensSince(email, new Date(Date.now() - 3600_000));
  if (recent >= LOGIN_LINKS_PER_HOUR) {
    return { ok: false, status: 429, error: 'Too many sign-in links requested. Try again in an hour.' };
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !process.env.BREVO_API_KEY) {
    console.error('[auth] BREVO_API_KEY is not set — sign-in emails cannot be sent');
    return { ok: false, status: 503, error: 'Sign-in is temporarily unavailable.' };
  }

  const { token, hash } = newLoginToken();
  await repo.createLoginToken(hash, email, new Date(Date.now() + LOGIN_TOKEN_TTL_MS));
  const link = `${origin}/api/auth/verify?token=${token}&next=${encodeURIComponent(next)}`;
  const sent = await sendLoginLinkEmail({ email, link });
  if (!sent.success) {
    console.error('[auth] sign-in email failed:', sent.error);
    return { ok: false, status: 502, error: 'We could not send the sign-in email. Please try again.' };
  }
  return { ok: true, ...(sent.mocked && !isProduction ? { devLink: link } : {}) };
}
