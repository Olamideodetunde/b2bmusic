import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { upsertTrackFromIngest } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { sendPublishAlertEmail } from '@/lib/email/brevo';
import { getSiteUrl } from '@/lib/utils';
import { IngestTrackPayload } from '@/lib/db/types';

// Helper to parse duration from strings like "2:45", "165", or numbers
function parseDurationToSeconds(val: any): number {
  if (!val) return 150;
  if (typeof val === 'number') return Math.max(10, Math.floor(val));
  const str = String(val).trim();
  if (str.includes(':')) {
    const parts = str.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
  }
  const parsed = parseInt(str.replace(/\D/g, ''), 10);
  return isNaN(parsed) || parsed <= 0 ? 150 : parsed;
}

// Helper to normalize price to cents (e.g. 10 -> 1000, "$10" -> 1000, 1000 -> 1000)
function parsePriceToCents(val: any, defaultCents: number): number {
  if (val === undefined || val === null || val === '') return defaultCents;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num) || num <= 0) return defaultCents;
  // If user passed dollar amount like 10, 20, 40 -> convert to cents
  if (num < 100) return Math.round(num * 100);
  return Math.round(num);
}

// Helper to parse array fields like moods and useCases from strings or arrays
function parseStringArray(val: any, defaults: string[]): string[] {
  if (Array.isArray(val)) {
    const cleaned = val.map(s => String(s).trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : defaults;
  }
  if (typeof val === 'string' && val.trim()) {
    const cleaned = val.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : defaults;
  }
  return defaults;
}

// CORS headers for Make.com and external automation tools
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

/**
 * OPTIONS Handler for CORS Preflight (Essential for Make.com and web clients)
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * GET Handler — Diagnostic status check
 * Allows client or Make.com users to test the endpoint directly in browser/HTTP client
 */
export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/track-pages',
    message: 'B2B Production Music Ingestion API is active and ready for Make.com',
    authMethod: 'Header "Authorization: Bearer <INGESTION_API_KEY>" or "x-api-key: <KEY>"',
    idempotent: true,
    supportedFields: [
      'title', 'targetKeyword', 'genre', 'bpm', 'musicalKey', 'duration',
      'description', 'moods', 'useCases', 'audioUrl', 'coverImageUrl', 'prices', 'id'
    ]
  }, {
    status: 200,
    headers: corsHeaders
  });
}

/**
 * POST Handler — Ingest and publish/update track with full idempotency
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate Make.com request
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    const xApiKey = request.headers.get('x-api-key');
    const urlApiKey = request.nextUrl.searchParams.get('apiKey') || request.nextUrl.searchParams.get('api_key');

    const expectedKey = process.env.INGESTION_API_KEY || 'b2b_music_dev_key_2026';

    const tokenFromBearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const providedKey = tokenFromBearer || xApiKey || urlApiKey || (authHeader && authHeader === expectedKey ? authHeader : null);

    if (!providedKey || providedKey !== expectedKey) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or missing Bearer token. Use Header "Authorization: Bearer <INGESTION_API_KEY>".'
        },
        { status: 401, headers: corsHeaders }
      );
    }

    // 2. Parse request body safely
    let rawBody: any;
    try {
      rawBody = await request.json();
    } catch (parseErr) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Payload must be a JSON object' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Auto-normalize flexible field aliases from Make.com & Google Sheets
    const title = (rawBody.title || rawBody.Title || '').trim();
    if (!title) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Field "title" is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const targetKeyword = (
      rawBody.targetKeyword ||
      rawBody.target_keyword ||
      rawBody.TargetKeyword ||
      rawBody.keyword ||
      rawBody.Keyword ||
      title
    ).trim();

    const genre = (
      rawBody.genre ||
      rawBody.Genre ||
      'Electronic'
    ).trim();

    const bpmRaw = rawBody.bpm || rawBody.BPM;
    const bpm = typeof bpmRaw === 'number'
      ? Math.max(40, Math.min(260, Math.floor(bpmRaw)))
      : parseInt(String(bpmRaw || '120').replace(/\D/g, ''), 10) || 120;

    const musicalKey = (
      rawBody.musicalKey ||
      rawBody.musical_key ||
      rawBody.MusicalKey ||
      rawBody.key ||
      rawBody.Key ||
      'C Major'
    ).trim();

    const description = (
      rawBody.description ||
      rawBody.Description ||
      `Master commercial sync track titled "${title}". 100% pre-cleared with isolated stems and broadcast cutdowns.`
    ).trim();

    const audioUrl = (
      rawBody.audioUrl ||
      rawBody.previewAudioUrl ||
      rawBody.audio_url ||
      rawBody.preview_audio_url ||
      rawBody.AudioUrl ||
      rawBody.audio ||
      ''
    ).trim();

    if (!audioUrl || !audioUrl.startsWith('http')) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'A valid public streaming URL is required in "audioUrl" or "previewAudioUrl". Received: ' + (audioUrl || 'empty')
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const coverImageUrl = (
      rawBody.coverImageUrl ||
      rawBody.cover_image_url ||
      rawBody.CoverImageUrl ||
      rawBody.coverUrl ||
      rawBody.image ||
      ''
    ).trim();

    // Parse duration
    const durationSeconds = parseDurationToSeconds(
      rawBody.durationSeconds || rawBody.duration || rawBody.Duration
    );

    // Parse prices (supports nested object or flat fields)
    const rawPrices = rawBody.prices || {};
    const standardPriceCents = parsePriceToCents(
      rawBody.standardPriceCents ?? rawPrices.standard ?? rawPrices.Standard ?? rawBody.standardPrice ?? rawBody.standard_price ?? rawBody.standard,
      1000
    );
    const agencyPriceCents = parsePriceToCents(
      rawBody.agencyPriceCents ?? rawPrices.agency ?? rawPrices.commercial ?? rawPrices.Agency ?? rawBody.commercialPrice ?? rawBody.agencyPrice ?? rawBody.commercial_price,
      2000
    );
    const broadcastPriceCents = parsePriceToCents(
      rawBody.broadcastPriceCents ?? rawPrices.broadcast ?? rawPrices.Broadcast ?? rawBody.broadcastPrice ?? rawBody.broadcast_price,
      4000
    );

    // Parse moods & useCases
    const moods = parseStringArray(
      rawBody.moods || rawBody.Moods,
      ['Commercial', 'Pre-Cleared', 'Dynamic']
    );

    const useCases = parseStringArray(
      rawBody.useCases || rawBody.use_cases || rawBody.UseCases,
      ['Commercial Video', 'Social Campaign', 'Web Promo']
    );

    // Construct normalized Ingest payload
    const normalizedPayload: IngestTrackPayload = {
      id: rawBody.id || rawBody.trackId || rawBody.track_id,
      slug: rawBody.slug,
      title,
      targetKeyword,
      bpm,
      musicalKey,
      genre,
      moods,
      useCases,
      description,
      previewAudioUrl: audioUrl,
      fullAudioUrl: rawBody.fullAudioUrl || rawBody.full_audio_url || undefined,
      coverImageUrl: coverImageUrl || undefined,
      durationSeconds,
      standardPriceCents,
      agencyPriceCents,
      broadcastPriceCents,
      altMixes: rawBody.altMixes,
      stems: rawBody.stems,
      syncMeta: rawBody.syncMeta
    };

    // 4. Upsert track record into Neon Postgres with guaranteed idempotency
    const { track, isUpdate } = await upsertTrackFromIngest(normalizedPayload);

    // 5. Trigger Incremental Static Regeneration (ISR)
    const siteUrl = getSiteUrl();
    const trackPageUrl = `${siteUrl}/tracks/${track.slug}`;

    try {
      revalidatePath(`/tracks/${track.slug}`);
      revalidatePath(`/genres/${encodeURIComponent(track.genre.toLowerCase().replace(/\s+/g, '-'))}`);
      revalidatePath('/');
      revalidatePath('/sitemap.xml');
    } catch (revalErr) {
      console.warn('Revalidation notice:', revalErr);
    }

    // 6. Asynchronously send Brevo email notification without blocking Make.com response
    if (!isUpdate) {
      sendPublishAlertEmail(track.title, track.slug, trackPageUrl).catch(err => {
        console.warn('Brevo email notice (non-fatal):', err);
      });
    }

    // 7. Return clean response to Make.com for Google Sheets status write-back
    return NextResponse.json({
      success: true,
      action: isUpdate ? 'updated' : 'created',
      message: isUpdate
        ? `Track "${track.title}" updated successfully and page revalidated`
        : `New track "${track.title}" published successfully with ISR`,
      data: {
        id: track.id,
        title: track.title,
        slug: track.slug,
        targetKeyword: track.targetKeyword,
        liveUrl: trackPageUrl,
        isUpdate,
        publishedAt: track.publishedAt,
        updatedAt: track.updatedAt,
      }
    }, {
      status: isUpdate ? 200 : 201,
      headers: corsHeaders
    });

  } catch (error: any) {
    console.error('Ingestion API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing ingestion', message: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
