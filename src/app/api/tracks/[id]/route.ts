import { NextResponse } from 'next/server';
import { requireApiKey, readJsonBody } from '@/lib/api/auth';
import { handlePublish } from '@/lib/api/publish-handler';
import { getRepository } from '@/lib/db';
import { canonicalizeKeys } from '@/lib/ingest/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** GET /api/tracks/:id — the stored record (including unpublished fields). Authenticated. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const id = parseId(params.id);
  const track = id ? await getRepository().findById(id) : null;
  if (!track) return NextResponse.json({ ok: false, errorSummary: 'Track not found' }, { status: 404 });
  return NextResponse.json({ ok: true, track });
}

/** PUT /api/tracks/:id — explicit update of an existing track (same URL, no duplicate). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ ok: false, status: 'Error', errorSummary: 'Invalid Track ID' }, { status: 400 });

  const parsed = await readJsonBody(req);
  if ('error' in parsed) return parsed.error;

  // The URL's id wins: drop every body key that maps to Track ID ("Track ID", "id", "track_id"…).
  const body = Object.fromEntries(
    Object.entries(parsed.body as Record<string, unknown>).filter(([k]) => canonicalizeKeys({ [k]: 1 }).trackId === undefined),
  );
  return handlePublish({ ...body, trackId: id });
}

export const PATCH = PUT;
