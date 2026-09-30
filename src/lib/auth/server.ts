import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import type { User } from '@/lib/db/types';
import { loadViewer, type Viewer } from './access';
import { SESSION_COOKIE, createSessionValue, readSessionValue, sessionCookieOptions } from './session';

/** The signed-in viewer for this request (route handlers / server components), or null. */
export async function getViewer(): Promise<Viewer | null> {
  const session = readSessionValue(cookies().get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return loadViewer(getRepository(), session);
}

/** Starts a session on the given response. */
export async function signIn(res: NextResponse, user: User): Promise<NextResponse> {
  res.cookies.set(SESSION_COOKIE, createSessionValue(user), sessionCookieOptions);
  await getRepository().touchLogin(user.id).catch(() => {});
  return res;
}

export function signOut(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
  return res;
}
