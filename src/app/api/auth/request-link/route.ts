import { NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/api/auth';
import { isValidEmail, safeNextPath, sessionSecret } from '@/lib/auth/session';
import { appOrigin, isSameOriginRequest } from '@/lib/auth/origin';
import { issueLoginLink } from '@/lib/auth/links';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/request-link { email, next? } — emails a one-time sign-in link.
 * Always answers the same way whether or not the email has an account, so the
 * endpoint can't be used to discover customers. The link is only ever delivered by
 * email in production (see issueLoginLink).
 */
export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!sessionSecret()) return NextResponse.json({ error: 'Sign-in is not configured' }, { status: 503 });
  const parsed = await readJsonBody(req, 4 * 1024);
  if ('error' in parsed) return parsed.error;
  const email = String(parsed.body?.email ?? '').trim().toLowerCase();
  if (!isValidEmail(email)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });

  const result = await issueLoginLink(appOrigin(req), email, safeNextPath(parsed.body?.next));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, ...(result.devLink ? { devLink: result.devLink } : {}) });
}
