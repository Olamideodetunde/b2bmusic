import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getRepository } from '../db';
import { StorageNotConfiguredError } from '../db/repository';
import { publishTrack } from '../ingest/service';
import { sendPublishAlertEmail, sendPublishFailureEmail } from '../email/brevo';

/**
 * Shared by POST /api/tracks and PUT /api/tracks/:id.
 * The JSON response is shaped for Make.com's write-back step:
 *   success → { ok: true,  status: "Published", trackId, liveUrl, ... }
 *   failure → { ok: false, status: "Error", errorSummary, errors: [{ field, message }] }
 */
export async function handlePublish(body: Record<string, unknown>): Promise<NextResponse> {
  try {
    const result = await publishTrack(getRepository(), body);

    if (!result.ok) {
      // A Draft row isn't a failure — it's a row the client hasn't released yet. Don't alert on it.
      const isDraft = result.httpStatus === 409 && result.errors.length === 1 && result.errors[0].field === 'status';
      if (!isDraft) {
        await sendPublishFailureEmail({ title: String(body.title ?? body.Title ?? ''), errorSummary: result.errorSummary });
      }
      return NextResponse.json(
        { ok: false, status: result.status, errorSummary: result.errorSummary, errors: result.errors, warnings: result.warnings },
        { status: result.httpStatus },
      );
    }

    // Refresh only the pages this track appears on — not the whole site.
    for (const path of result.paths) revalidatePath(path);
    if (result.layoutChanged) revalidatePath('/', 'layout'); // genre list in nav/footer changed

    await sendPublishAlertEmail({
      title: result.track.title,
      slug: result.slug,
      liveUrl: result.liveUrl,
      action: result.action,
      trackId: result.trackId,
      warnings: result.warnings,
    });

    return NextResponse.json(
      {
        ok: true,
        status: result.status,
        action: result.action,
        trackId: result.trackId,
        slug: result.slug,
        liveUrl: result.liveUrl,
        warnings: result.warnings,
        revalidated: result.paths,
      },
      { status: result.action === 'created' ? 201 : 200 },
    );
  } catch (err: any) {
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json({ ok: false, status: 'Error', errorSummary: err.message }, { status: 503 });
    }
    console.error('[publish] unexpected failure', err);
    return NextResponse.json(
      { ok: false, status: 'Error', errorSummary: 'Internal error while publishing — safe to retry' },
      { status: 500 },
    );
  }
}
