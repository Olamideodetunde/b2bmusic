import { NextResponse } from 'next/server';
import { signOut } from '@/lib/auth/server';
import { isSameOriginRequest } from '@/lib/auth/origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — clears the session cookie. */
export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return signOut(NextResponse.json({ ok: true }));
}
