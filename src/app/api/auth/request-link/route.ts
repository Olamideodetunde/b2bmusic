import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { readJsonBody } from '@/lib/api/auth';
import { LOGIN_LINKS_PER_HOUR, LOGIN_TOKEN_TTL_MS, isValidEmail, newLoginToken, safeNextPath, sessionSecret } from '@/lib/auth/session';
import { appOrigin } from '@/lib/auth/origin';
import { sendLoginLinkEmail } from '@/lib/email/brevo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/request-link { email, next? } — emails a one-time sign-in link.
 * Always answers the same way whether or not the email has an account, so the
 * endpoint can't be used to discover customers.
 */
export async function POST(req: Request) {
  if (!sessionSecret()) return NextResponse.json({ error: 'Sign-in is not configured' }, { status: 503 });
  const parsed = await readJsonBody(req, 4 * 1024);
  if ('error' in parsed) return parsed.error;
  const email = String(parsed.body?.email ?? '').trim().toLowerCase();
  if (!isValidEmail(email)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  const next = safeNextPath(parsed.body?.next);

  const repo = getRepository();
  const recent = await repo.countLoginTokensSince(email, new Date(Date.now() - 3600_000));
  if (recent >= LOGIN_LINKS_PER_HOUR) {
    return NextResponse.json({ error: 'Too many sign-in links requested. Try again in an hour.' }, { status: 429 });
  }

  const { token, hash } = newLoginToken();
  await repo.createLoginToken(hash, email, new Date(Date.now() + LOGIN_TOKEN_TTL_MS));
  const link = `${appOrigin(req)}/api/auth/verify?token=${token}&next=${encodeURIComponent(next)}`;
  const sent = await sendLoginLinkEmail({ email, link });

  return NextResponse.json({
    ok: true,
    // Without Brevo configured (local development) the link is returned so sign-in can be tested.
    ...(sent.success && sent.mocked && process.env.NODE_ENV !== 'production' ? { devLink: link } : {}),
  });
}
