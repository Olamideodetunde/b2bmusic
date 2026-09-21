import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { upsertTrackFromIngest } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { sendPublishAlertEmail } from '@/lib/email/brevo';

const IngestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  targetKeyword: z.string().min(1, 'Target keyword is required'),
  bpm: z.coerce.number().int().min(40).max(260),
  musicalKey: z.string().min(1, 'Musical key is required'),
  genre: z.string().min(1, 'Genre is required'),
  moods: z.union([z.array(z.string()), z.string()]).optional(),
  useCases: z.union([z.array(z.string()), z.string()]).optional(),
  description: z.string().min(10, 'Rich commercial description is required'),
  previewAudioUrl: z.string().url('Valid preview audio URL is required'),
  fullAudioUrl: z.string().url().optional().or(z.literal('')),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  durationSeconds: z.coerce.number().optional(),
  standardPriceCents: z.coerce.number().optional(),
  agencyPriceCents: z.coerce.number().optional(),
  broadcastPriceCents: z.coerce.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate Make.com request
    const authHeader = request.headers.get('Authorization');
    const expectedKey = process.env.INGESTION_API_KEY || 'b2b_music_dev_key_2026';

    if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing Bearer token' },
        { status: 401 }
      );
    }

    // 2. Parse and validate payload
    const body = await request.json();
    const parsed = IngestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    // 3. Upsert track record into Neon Postgres
    const track = await upsertTrackFromIngest(parsed.data);

    // 4. Trigger Incremental Static Regeneration (ISR)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const trackPageUrl = `${siteUrl}/tracks/${track.slug}`;

    try {
      revalidatePath(`/tracks/${track.slug}`);
      revalidatePath(`/genres/${encodeURIComponent(track.genre.toLowerCase().replace(/\s+/g, '-'))}`);
      revalidatePath('/');
      revalidatePath('/sitemap.xml');
    } catch (revalErr) {
      console.warn('Revalidation notice:', revalErr);
    }

    // 5. Send Brevo publish notification email to admin
    try {
      await sendPublishAlertEmail(track.title, track.slug, trackPageUrl);
    } catch (mailErr) {
      console.warn('Brevo email notice:', mailErr);
    }

    // 6. Return response to Make.com for Google Sheets status write-back
    return NextResponse.json({
      success: true,
      message: 'Track published successfully with ISR',
      data: {
        id: track.id,
        title: track.title,
        slug: track.slug,
        targetKeyword: track.targetKeyword,
        liveUrl: trackPageUrl,
        publishedAt: track.publishedAt,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Ingestion API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing ingestion', message: error.message },
      { status: 500 }
    );
  }
}
