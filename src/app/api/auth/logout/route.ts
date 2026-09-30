import { NextResponse } from 'next/server';
import { signOut } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — clears the session cookie. */
export async function POST() {
  return signOut(NextResponse.json({ ok: true }));
}
