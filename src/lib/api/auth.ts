import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

/**
 * Bearer-key auth for server-to-server calls (Make.com, scripts, cache refresh).
 *   Authorization: Bearer <secret>      (or header  x-api-key: <secret>)
 *
 * Secrets (names match the Vercel project):
 *   INGESTION_API_KEY    — publish / update / publish log   (legacy alias: INGEST_API_KEY)
 *   REVALIDATION_SECRET  — POST /api/revalidate (the ingestion key is accepted too)
 *
 * Fails closed: if no secret is configured, every request is refused.
 * Returns a response to send back on failure, or null when authorized.
 */
export type SecretScope = 'ingest' | 'revalidate';

export function ingestionKey(): string | undefined {
  return process.env.INGESTION_API_KEY || process.env.INGEST_API_KEY || undefined;
}

function acceptedSecrets(scope: SecretScope): string[] {
  const keys = [ingestionKey()];
  if (scope === 'revalidate') keys.push(process.env.REVALIDATION_SECRET);
  return keys.filter((k): k is string => typeof k === 'string' && k.length >= 24);
}

const digest = (s: string) => createHash('sha256').update(s).digest();

export function requireApiKey(req: Request, scope: SecretScope = 'ingest'): NextResponse | null {
  const accepted = acceptedSecrets(scope);
  if (accepted.length === 0) {
    const name = scope === 'revalidate' ? 'REVALIDATION_SECRET or INGESTION_API_KEY' : 'INGESTION_API_KEY';
    return NextResponse.json(
      { ok: false, status: 'Error', errorSummary: `Server misconfigured: ${name} is missing or shorter than 24 characters` },
      { status: 503 },
    );
  }

  const header = req.headers.get('authorization') ?? '';
  const provided = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : req.headers.get('x-api-key')?.trim() ?? '';

  // Hash both sides so each comparison is constant-time regardless of length.
  const p = digest(provided);
  const ok = provided !== '' && accepted.some(secret => timingSafeEqual(p, digest(secret)));
  if (!ok) {
    return NextResponse.json({ ok: false, status: 'Error', errorSummary: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** Reads a JSON body with a size cap. Returns an error response instead of throwing. */
export async function readJsonBody(req: Request, maxBytes = 256 * 1024): Promise<{ body: any } | { error: NextResponse }> {
  const text = await req.text();
  if (text.length > maxBytes) {
    return { error: NextResponse.json({ ok: false, status: 'Error', errorSummary: 'Payload too large' }, { status: 413 }) };
  }
  try {
    return { body: text ? JSON.parse(text) : {} };
  } catch {
    return { error: NextResponse.json({ ok: false, status: 'Error', errorSummary: 'Body must be valid JSON' }, { status: 400 }) };
  }
}
