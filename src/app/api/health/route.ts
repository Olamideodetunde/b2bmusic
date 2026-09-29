import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/health — uptime checks. Reports storage reachability without leaking config. */
export async function GET() {
  const repo = getRepository();
  try {
    const counts = await repo.genreCounts();
    return NextResponse.json({
      ok: true,
      storage: repo.kind,
      publishedTracks: Object.values(counts).reduce((a, b) => a + b, 0),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      email: Boolean(process.env.BREVO_API_KEY),
    });
  } catch {
    return NextResponse.json({ ok: false, storage: repo.kind }, { status: 503 });
  }
}
