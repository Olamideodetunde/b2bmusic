import { NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api/auth';
import { getRepository } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/publish-log?limit=50 — recent publish / reject / revalidate events. Authenticated. */
export async function GET(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const limit = Math.min(200, Math.max(1, Number(new URL(req.url).searchParams.get('limit')) || 50));
  return NextResponse.json({ ok: true, events: await getRepository().recentEvents(limit) });
}
