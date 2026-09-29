import { requireApiKey, readJsonBody } from '@/lib/api/auth';
import { handlePublish } from '@/lib/api/publish-handler';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'B2B Production Music Ingestion API',
      status: 'ready',
      method: 'POST',
      acceptedEndpoints: ['/api/tracks', '/api/track-pages', '/api/tracks/ingest'],
      auth: 'Bearer <INGESTION_API_KEY> or x-api-key',
    },
    { headers: corsHeaders }
  );
}

/**
 * POST /api/tracks — create OR update a track from one Google Sheet row.
 * Rows without a Track ID create a page; rows with one update it in place.
 * Called by the Make.com scenario (see docs/make-scenario.md).
 */
export async function POST(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  const parsed = await readJsonBody(req);
  if ('error' in parsed) return parsed.error;

  return handlePublish(parsed.body);
}
