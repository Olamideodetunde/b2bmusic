import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { hashLoginToken, safeNextPath } from '@/lib/auth/session';
import { signIn } from '@/lib/auth/server';
import { appOrigin } from '@/lib/auth/origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/auth/verify?token=…&next=/tracks/… — the link in the sign-in email. Single use, 20 minutes. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = appOrigin(req);
  const next = safeNextPath(url.searchParams.get('next'));
  const token = url.searchParams.get('token') ?? '';

  const repo = getRepository();
  const email = /^[A-Za-z0-9_-]{20,100}$/.test(token) ? await repo.consumeLoginToken(hashLoginToken(token)) : null;
  if (!email) {
    const back = new URL(next, origin);
    back.searchParams.set('signin', 'expired');
    return NextResponse.redirect(back, 303);
  }

  const user = await repo.upsertUser(email);
  const dest = new URL(next, origin);
  dest.searchParams.set('signin', 'ok');
  return signIn(NextResponse.redirect(dest, 303), user);
}
