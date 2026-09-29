import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireApiKey, readJsonBody } from '@/lib/api/auth';
import { getRepository } from '@/lib/db';
import { affectedPaths } from '@/lib/ingest/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/revalidate — manually refresh cached pages without re-publishing.
 *   { "trackId": 12 }            → that track's page and every hub it appears on
 *   { "paths": ["/genres/ambient"] }
 *   { "all": true }              → every page (e.g. after a template deploy); use sparingly
 */
export async function POST(req: Request) {
  const denied = requireApiKey(req, 'revalidate');
  if (denied) return denied;

  const parsed = await readJsonBody(req);
  if ('error' in parsed) return parsed.error;
  const { trackId, paths, all } = parsed.body ?? {};

  const repo = getRepository();
  const done: string[] = [];

  if (all === true) {
    revalidatePath('/', 'layout');
    done.push('/ (layout — all pages)');
  }

  if (trackId !== undefined) {
    const track = await repo.findById(Number(trackId));
    if (!track) return NextResponse.json({ ok: false, errorSummary: `Track ${trackId} not found` }, { status: 404 });
    for (const p of affectedPaths(null, track)) {
      revalidatePath(p);
      done.push(p);
    }
  }

  if (Array.isArray(paths)) {
    const valid = paths.filter((p: unknown): p is string => typeof p === 'string' && /^\/[\w\-/.]*$/.test(p)).slice(0, 100);
    for (const p of valid) {
      revalidatePath(p);
      done.push(p);
    }
  }

  if (done.length === 0) {
    return NextResponse.json({ ok: false, errorSummary: 'Provide trackId, paths[] or all: true' }, { status: 400 });
  }

  await repo.logEvent({ trackId: trackId !== undefined ? Number(trackId) : null, action: 'revalidated', ok: true, message: done.join(', ').slice(0, 480) });
  return NextResponse.json({ ok: true, revalidated: done });
}
