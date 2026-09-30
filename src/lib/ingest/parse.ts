import type { SyncMeta, TrackInput } from '../db/types';
import { GENRES, SHEET_STATUSES, canonicalGenre, type SheetStatus } from '../catalog/taxonomy';
import { parseMusicalKey } from '../utils';
import { isValidObjectKey } from '../storage/keys';

export interface FieldError {
  field: string;
  message: string;
}

export interface ParsedRow {
  input: TrackInput | null;
  trackId: number | null;
  status: SheetStatus | null;
  errors: FieldError[];
  warnings: string[];
}

/**
 * Header aliases → canonical field. Keys are normalized (lowercase, alphanumerics only),
 * so Make.com can send the sheet's own column headers ("Target Keyword", "Standard Price")
 * or camelCase JSON ("targetKeyword", "standardPrice") interchangeably.
 */
const ALIASES: Record<string, string> = {
  title: 'title',
  targetkeyword: 'targetKeyword', keyword: 'targetKeyword',
  genre: 'genre',
  bpm: 'bpm', tempo: 'bpm',
  musicalkey: 'musicalKey', key: 'musicalKey',
  duration: 'duration', durationseconds: 'durationSeconds',
  description: 'description',
  moods: 'moods', mood: 'moods',
  usecases: 'useCases', usecase: 'useCases',
  audiourl: 'audioUrl', previewaudiourl: 'audioUrl', audio: 'audioUrl',
  coverimageurl: 'coverImageUrl', coverurl: 'coverImageUrl', coverimage: 'coverImageUrl',
  standardprice: 'standardPrice', standardpricecents: 'standardPriceCents',
  commercialprice: 'commercialPrice', commercialpricecents: 'commercialPriceCents',
  broadcastprice: 'broadcastPrice', broadcastpricecents: 'broadcastPriceCents',
  status: 'status',
  trackid: 'trackId', id: 'trackId',
  liveurl: 'liveUrl',
  fullaudiourl: 'fullAudioUrl',
  masterwav: 'masterWavKey', masterwavkey: 'masterWavKey', masterfile: 'masterWavKey', master: 'masterWavKey',
  masteraiff: 'masterAiffKey', masteraiffkey: 'masterAiffKey',
  vocaltype: 'vocalType', vocal: 'vocalType',
  altmixes: 'altMixes',
  stems: 'stems',
  syncmeta: 'syncMeta',
};

const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Maps arbitrary header spellings onto canonical field names. Unknown keys are dropped. */
export function canonicalizeKeys(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const field = ALIASES[norm(k)];
    if (field && out[field] === undefined) out[field] = v;
  }
  return out;
}

const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const str = (v: unknown) => (isBlank(v) ? '' : String(v).trim());

function parseList(v: unknown): string[] {
  const items = Array.isArray(v) ? v.map(String) : str(v).split(/[,;\n]/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const item = raw.trim().replace(/\s+/g, ' ');
    if (!item || seen.has(item.toLowerCase())) continue;
    seen.add(item.toLowerCase());
    out.push(item);
  }
  return out;
}

/** "$1,250.00" / "20" / 20 → cents. */
function parseDollarsToCents(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) : null;
  const cleaned = str(v).replace(/[$£€₦\s]/g, '').replace(/,(?=\d{3}(\D|$))/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

/**
 * "2:45" → 165. Also handles Google Sheets auto-converting a typed "2:45" into a
 * time value ("2:45:00", or a fraction of a day), which would otherwise read as
 * 2 hours 45 minutes.
 */
function parseDuration(v: unknown, warnings: string[]): number | null {
  let seconds: number | null = null;
  if (typeof v === 'number') {
    seconds = v > 0 && v < 1 ? Math.round(v * 86_400) : Math.round(v); // day fraction vs seconds
  } else {
    const s = str(v);
    if (/^\d+$/.test(s)) seconds = parseInt(s, 10);
    else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
      const parts = s.split(':').map(n => parseInt(n, 10));
      seconds = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  if (seconds !== null && seconds > 3600 && seconds % 60 === 0 && seconds / 60 <= 3600) {
    warnings.push(`Duration looked like h:mm (${v}); read it as m:ss. Format the Duration column as Plain text to avoid this.`);
    seconds = seconds / 60;
  }
  return seconds;
}

/** Accepts absolute http(s) URLs, or site-relative paths ("/audio/x.mp3"). */
function parseUrl(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function parseJsonField<T>(v: unknown): T | undefined {
  if (isBlank(v)) return undefined;
  if (typeof v === 'object') return v as T;
  try {
    return JSON.parse(String(v)) as T;
  } catch {
    return undefined;
  }
}

/** Validates one sheet row / API payload. Collects every error rather than stopping at the first. */
export function parseTrackRow(raw: Record<string, unknown>): ParsedRow {
  const f = canonicalizeKeys(raw);
  const errors: FieldError[] = [];
  const warnings: string[] = [];
  const need = (field: string, label: string) => {
    if (isBlank(f[field])) errors.push({ field, message: `${label} is required` });
  };

  // ── Status & Track ID ──
  let status: SheetStatus | null = null;
  if (!isBlank(f.status)) {
    status = SHEET_STATUSES.find(s => s.toLowerCase() === str(f.status).toLowerCase()) ?? null;
    if (!status) errors.push({ field: 'status', message: `Status must be one of ${SHEET_STATUSES.join(', ')}` });
  }

  let trackId: number | null = null;
  if (!isBlank(f.trackId)) {
    const n = Number(str(f.trackId));
    if (Number.isInteger(n) && n > 0) trackId = n;
    else errors.push({ field: 'trackId', message: 'Track ID must be the number written back by the system — do not edit it' });
  }

  // ── Text ──
  need('title', 'Title');
  const title = str(f.title);
  if (title.length > 200) errors.push({ field: 'title', message: 'Title must be 200 characters or fewer' });

  need('targetKeyword', 'Target Keyword');
  const targetKeyword = str(f.targetKeyword).replace(/\s+/g, ' ');
  if (targetKeyword && (targetKeyword.length < 3 || targetKeyword.length > 120)) {
    errors.push({ field: 'targetKeyword', message: 'Target Keyword must be 3–120 characters' });
  }

  need('genre', 'Genre');
  const genre = isBlank(f.genre) ? null : canonicalGenre(str(f.genre));
  if (!isBlank(f.genre) && !genre) {
    errors.push({ field: 'genre', message: `Genre "${str(f.genre)}" is not in the dropdown list (${GENRES.join(', ')})` });
  }

  need('description', 'Description');
  const description = str(f.description);
  if (description && description.length < 60) {
    errors.push({ field: 'description', message: 'Description must be at least 60 characters — thin descriptions hurt SEO' });
  }
  if (description.length > 3000) errors.push({ field: 'description', message: 'Description must be 3,000 characters or fewer' });

  // ── Numbers ──
  need('bpm', 'BPM');
  const bpm = parseInt(str(f.bpm).replace(/bpm/i, ''), 10);
  if (!isBlank(f.bpm) && (!Number.isInteger(bpm) || bpm < 40 || bpm > 250)) {
    errors.push({ field: 'bpm', message: 'BPM must be a whole number between 40 and 250' });
  }

  need('musicalKey', 'Musical Key');
  const key = parseMusicalKey(str(f.musicalKey));
  let musicalKey = '';
  if (!isBlank(f.musicalKey)) {
    if (!key.camelot) {
      errors.push({ field: 'musicalKey', message: `Musical Key "${str(f.musicalKey)}" not recognised — use e.g. "A Minor" or "F# Major"` });
    } else {
      const root = key.short.replace(/m$/, '');
      musicalKey = `${root} ${key.camelot.endsWith('A') ? 'Minor' : 'Major'}`;
    }
  }

  const durationRaw = f.durationSeconds ?? f.duration;
  if (isBlank(durationRaw)) errors.push({ field: 'duration', message: 'Duration is required (e.g. 2:45)' });
  const durationSeconds = isBlank(durationRaw) ? null : parseDuration(durationRaw, warnings);
  if (!isBlank(durationRaw) && (durationSeconds === null || durationSeconds < 1 || durationSeconds > 3600)) {
    errors.push({ field: 'duration', message: 'Duration must look like 2:45 and be under an hour' });
  }

  // ── Tags ──
  const moods = parseList(f.moods);
  const useCases = parseList(f.useCases);
  if (moods.length === 0) errors.push({ field: 'moods', message: 'Add at least one mood (comma-separated)' });
  if (useCases.length === 0) errors.push({ field: 'useCases', message: 'Add at least one use case (comma-separated)' });
  for (const [field, list] of [['moods', moods], ['useCases', useCases]] as const) {
    if (list.length > 12) errors.push({ field, message: 'Use 12 tags or fewer' });
    if (list.some(t => t.length > 60)) errors.push({ field, message: 'Each tag must be 60 characters or fewer' });
  }

  // ── URLs ──
  need('audioUrl', 'Audio URL');
  const previewAudioUrl = parseUrl(f.audioUrl);
  if (!isBlank(f.audioUrl) && !previewAudioUrl) errors.push({ field: 'audioUrl', message: 'Audio URL must be a full https:// link to the MP3 preview' });
  const coverImageUrl = parseUrl(f.coverImageUrl) ?? undefined;
  if (!isBlank(f.coverImageUrl) && !coverImageUrl) errors.push({ field: 'coverImageUrl', message: 'Cover Image URL must be a full https:// link' });
  const fullAudioUrl = parseUrl(f.fullAudioUrl) ?? undefined;
  if (fullAudioUrl) warnings.push('Full Audio URL is a public link — move the master to the private bucket and use the Master WAV column instead');

  // Previews should be the watermarked MP3s published by `npm run audio:watermark`.
  const previewBase = (process.env.PREVIEW_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  if (previewAudioUrl && previewBase && !previewAudioUrl.startsWith(`${previewBase}/`)) {
    warnings.push(`Audio URL is not on the watermarked preview bucket (${previewBase}) — run npm run audio:watermark`);
  }

  // ── Masters: object keys in the PRIVATE bucket (e.g. "masters/titan-ascent.wav"), never URLs ──
  const masterKey = (field: 'masterWavKey' | 'masterAiffKey', label: string, ext: RegExp) => {
    if (isBlank(f[field])) return undefined;
    const key = str(f[field]).replace(/^\/+/, '');
    if (!isValidObjectKey(key)) {
      errors.push({ field, message: `${label} must be a file path inside the private masters bucket (e.g. masters/my-track.wav), not a URL` });
      return undefined;
    }
    if (!ext.test(key)) errors.push({ field, message: `${label} must point to a ${label.split(' ')[1]} file` });
    return key;
  };
  const masterWavKey = masterKey('masterWavKey', 'Master WAV', /\.wav$/i);
  const masterAiffKey = masterKey('masterAiffKey', 'Master AIFF', /\.aiff?$/i);

  // ── Prices ──
  const price = (field: 'standard' | 'commercial' | 'broadcast', label: string) => {
    const centsRaw = f[`${field}PriceCents`];
    const dollarsRaw = f[`${field}Price`];
    if (isBlank(centsRaw) && isBlank(dollarsRaw)) {
      errors.push({ field: `${field}Price`, message: `${label} is required` });
      return 0;
    }
    const cents = !isBlank(centsRaw) ? Math.round(Number(centsRaw)) : parseDollarsToCents(dollarsRaw);
    if (cents === null || !Number.isFinite(cents) || cents < 50 || cents > 10_000_000) {
      errors.push({ field: `${field}Price`, message: `${label} must be a price between $0.50 and $100,000` });
      return 0;
    }
    return cents;
  };
  const standardPriceCents = price('standard', 'Standard Price');
  const commercialPriceCents = price('commercial', 'Commercial Price');
  const broadcastPriceCents = price('broadcast', 'Broadcast Price');
  if (standardPriceCents && commercialPriceCents && broadcastPriceCents &&
      !(standardPriceCents <= commercialPriceCents && commercialPriceCents <= broadcastPriceCents)) {
    warnings.push('Prices are not ascending (Standard ≤ Commercial ≤ Broadcast) — check the tier columns');
  }

  const vocal = str(f.vocalType).toLowerCase();
  const vocalType = (['instrumental', 'female', 'male'] as const).find(v => v === vocal);

  if (errors.length > 0) return { input: null, trackId, status, errors, warnings };

  return {
    input: {
      title,
      targetKeyword,
      genre: genre!,
      bpm,
      musicalKey,
      durationSeconds: durationSeconds!,
      description,
      moods,
      useCases,
      previewAudioUrl: previewAudioUrl!,
      coverImageUrl,
      standardPriceCents,
      commercialPriceCents,
      broadcastPriceCents,
      fullAudioUrl,
      masterWavKey,
      masterAiffKey,
      vocalType,
      altMixes: parseJsonField(f.altMixes),
      stems: parseJsonField(f.stems),
      syncMeta: parseJsonField<SyncMeta>(f.syncMeta),
    },
    trackId,
    status,
    errors,
    warnings,
  };
}
