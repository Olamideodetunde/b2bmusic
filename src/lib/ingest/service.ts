import type { Track } from '../db/types';
import type { TrackRepository } from '../db/repository';
import { SlugConflictError } from '../db/repository';
import { parseTrackRow, type FieldError } from './parse';
import { generateSlug, makeUniqueSlug } from '../seo/slugify';
import { bpmBandFor } from '../catalog/taxonomy';
import { getSiteUrl, toSlug } from '../utils';

/**
 * Publish pipeline for one Google Sheet row (called by Make.com via POST /api/tracks).
 *
 * Rules, straight from the sheet's "How to use" tab:
 *  • A row with no Track ID is a new track → create a page, return Track ID + Live URL.
 *  • A row with a Track ID is an edit → update that page in place. Same URL, never a duplicate.
 *  • Anything invalid → reject with field-level errors so Make.com can set Status = "Error".
 */

export type PublishResult =
  | {
      ok: true;
      action: 'created' | 'updated';
      track: Track;
      trackId: number;
      slug: string;
      liveUrl: string;
      status: 'Published';
      warnings: string[];
      /** Paths whose ISR cache must be refreshed (the route handler calls revalidatePath). */
      paths: string[];
      /** True when the set of genres changed, so nav/footer (in the root layout) need a refresh. */
      layoutChanged: boolean;
    }
  | {
      ok: false;
      httpStatus: 400 | 404 | 409 | 422;
      status: 'Error';
      errors: FieldError[];
      /** One line for the sheet / Make.com error handler. */
      errorSummary: string;
      warnings: string[];
    };

export interface PublishOptions {
  /** HEAD-check that the Audio URL is reachable. Default: on, unless AUDIO_URL_CHECK=false. */
  checkAudioUrl?: boolean;
  fetchImpl?: typeof fetch;
}

function reject(httpStatus: 400 | 404 | 409 | 422, errors: FieldError[], warnings: string[] = []): PublishResult {
  return {
    ok: false,
    httpStatus,
    status: 'Error',
    errors,
    errorSummary: errors.map(e => `${e.field}: ${e.message}`).join(' | ').slice(0, 480),
    warnings,
  };
}

/** Verifies the preview MP3 actually resolves — the most common cause of Status = Error. */
export async function checkAudioUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  if (url.startsWith('/')) return null; // site-relative asset, served from /public
  const attempt = async (method: 'HEAD' | 'GET') => {
    const res = await fetchImpl(url, {
      method,
      redirect: 'follow',
      headers: method === 'GET' ? { Range: 'bytes=0-1' } : undefined,
      signal: AbortSignal.timeout(6000),
    });
    return res;
  };
  try {
    let res = await attempt('HEAD');
    if (res.status === 405 || res.status === 403) res = await attempt('GET'); // some CDNs block HEAD
    if (!res.ok && res.status !== 206) return `Audio URL returned HTTP ${res.status}`;
    const type = res.headers.get('content-type') ?? '';
    if (type && !/audio|octet-stream|mpeg/i.test(type)) return `Audio URL is not an audio file (content-type: ${type})`;
    return null;
  } catch (err: any) {
    return `Audio URL could not be reached (${err?.name === 'TimeoutError' ? 'timed out' : err?.message ?? 'network error'})`;
  }
}

/** Every page that shows this track — refreshed on publish, nothing else. */
export function affectedPaths(before: Track | null, after: Track): string[] {
  // (sitemap.xml is rendered per request, so it needs no revalidation)
  const paths = new Set<string>(['/', '/pricing', `/tracks/${after.slug}`]);
  for (const t of [before, after]) {
    if (!t) continue;
    paths.add(`/genres/${toSlug(t.genre)}`);
    paths.add(`/bpm/${bpmBandFor(t.bpm).slug}`);
    for (const u of t.useCases) paths.add(`/use-cases/${toSlug(u)}`);
  }
  return Array.from(paths);
}

const nonZeroGenres = (counts: Record<string, number>) =>
  Object.keys(counts).filter(g => counts[g] > 0).sort().join('|');

export async function publishTrack(
  repo: TrackRepository,
  raw: Record<string, unknown>,
  opts: PublishOptions = {},
): Promise<PublishResult> {
  const parsed = parseTrackRow(raw);
  const warnings = [...parsed.warnings];

  if (parsed.errors.length > 0 || !parsed.input) {
    const result = reject(422, parsed.errors, warnings);
    await repo.logEvent({ trackId: parsed.trackId, action: 'rejected', ok: false, message: result.ok ? '' : result.errorSummary, payload: raw });
    return result;
  }
  if (parsed.status === 'Draft') {
    return reject(409, [{ field: 'status', message: 'Row is still Draft — set Status to "Ready" to publish' }], warnings);
  }

  const input = parsed.input;

  // ── Resolve create vs update ──
  let existing: Track | null = null;
  if (parsed.trackId !== null) {
    existing = await repo.findById(parsed.trackId);
    if (!existing) {
      return reject(404, [{ field: 'trackId', message: `Track ID ${parsed.trackId} does not exist — never edit or copy Track IDs between rows` }], warnings);
    }
  } else {
    // No Track ID but same title + keyword already published: almost always a Make.com retry
    // whose write-back failed. Update instead of creating a duplicate page.
    existing = await repo.findByKeywordAndTitle(input.targetKeyword, input.title);
    if (existing) {
      warnings.push(`Matched existing track #${existing.id} by title + keyword — updated it instead of creating a duplicate. Make sure Track ID ${existing.id} is written back to the sheet.`);
    }
  }

  // ── Duplicate-content guards (SEO: no competing or doorway pages) ──
  const sameKeyword = (await repo.findByTargetKeyword(input.targetKeyword)).filter(t => t.id !== existing?.id);
  if (sameKeyword.length > 0) {
    const other = sameKeyword[0];
    return reject(409, [{
      field: 'targetKeyword',
      message: `"${input.targetKeyword}" is already targeted by track #${other.id} "${other.title}" (/tracks/${other.slug}). Each page needs its own search-intent keyword.`,
    }], warnings);
  }
  const sameDescription = await repo.findByDescription(input.description);
  if (sameDescription && sameDescription.id !== existing?.id) {
    return reject(409, [{
      field: 'description',
      message: `Description is identical to track #${sameDescription.id} "${sameDescription.title}". Every page needs a unique description.`,
    }], warnings);
  }

  // ── Audio reachability (skipped when the URL is unchanged on an update) ──
  const shouldCheckAudio = opts.checkAudioUrl ?? process.env.AUDIO_URL_CHECK !== 'false';
  if (shouldCheckAudio && existing?.previewAudioUrl !== input.previewAudioUrl) {
    const problem = await checkAudioUrl(input.previewAudioUrl, opts.fetchImpl);
    if (problem) return reject(422, [{ field: 'audioUrl', message: problem }], warnings);
  }

  const genresBefore = nonZeroGenres(await repo.genreCounts());

  // ── Write ──
  let track: Track;
  let action: 'created' | 'updated';
  if (existing) {
    track = await repo.update(existing.id, input);
    action = 'updated';
    const wanted = generateSlug(input.targetKeyword);
    if (existing.slug !== wanted && !new RegExp(`^${wanted}-\\d+$`).test(existing.slug)) {
      warnings.push(`Target keyword changed, but the URL stays /tracks/${existing.slug} so existing links and rankings aren't lost.`);
    }
  } else {
    const base = generateSlug(input.targetKeyword);
    if (!base) return reject(422, [{ field: 'targetKeyword', message: 'Target Keyword has no letters or numbers to build a URL from' }], warnings);
    let created: Track | null = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const slug = makeUniqueSlug(base, await repo.slugsLike(base));
      try {
        created = await repo.insert(input, slug);
        if (slug !== base) warnings.push(`URL /tracks/${base} was taken, so this track was published at /tracks/${slug}`);
      } catch (err) {
        if (!(err instanceof SlugConflictError)) throw err; // concurrent publish grabbed it — retry
      }
    }
    if (!created) throw new Error(`Could not allocate a unique slug for "${base}"`);
    track = created;
    action = 'created';
  }

  const layoutChanged = nonZeroGenres(await repo.genreCounts()) !== genresBefore;
  const liveUrl = `${getSiteUrl()}/tracks/${track.slug}`;
  await repo.logEvent({ trackId: track.id, action, ok: true, message: liveUrl, payload: raw });

  return {
    ok: true,
    action,
    track,
    trackId: track.id,
    slug: track.slug,
    liveUrl,
    status: 'Published',
    warnings,
    paths: affectedPaths(existing, track),
    layoutChanged,
  };
}
