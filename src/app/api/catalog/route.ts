import { NextResponse } from 'next/server';
import { getTracksByIds } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/catalog?ids=1,2,3 — public data for specific published tracks.
 * Used by the navbar Project Bin, so the root layout doesn't have to embed the whole
 * catalog (which would force every page to re-render on each publish).
 */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get('ids') ?? '')
    .split(',')
    .map(Number)
    .filter(n => Number.isInteger(n) && n > 0)
    .slice(0, 100);
  const tracks = await getTracksByIds(ids);
  return NextResponse.json({ tracks }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
