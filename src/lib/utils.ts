import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BRAND } from './brand';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Returns a guaranteed valid, normalized absolute site URL (e.g. https://globalb2baudioholding.com).
 * Prevents ERR_INVALID_URL when NEXT_PUBLIC_SITE_URL is set to localhost without protocol or domain without https.
 */
export function getSiteUrl(): string {
  let raw = process.env.NEXT_PUBLIC_SITE_URL;

  // Fallback to Vercel system environment variables if available
  if (!raw && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    raw = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  } else if (!raw && process.env.VERCEL_URL) {
    raw = `https://${process.env.VERCEL_URL}`;
  }

  if (!raw) {
    raw = `https://${BRAND.domain}`;
  }

  raw = raw.trim();

  // If localhost without protocol, prepend http://
  if (/^localhost(:\d+)?$/i.test(raw) || raw.startsWith('localhost:')) {
    raw = `http://${raw}`;
  } else if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }

  try {
    const parsed = new URL(raw);
    return parsed.origin;
  } catch {
    return `https://${BRAND.domain}`;
  }
}

/**
 * URL-safe slug shared by links, generateStaticParams and the sitemap, so all three agree.
 * "Tourism & Travel Campaign" → "tourism-and-travel-campaign"; "Tech Lo-Fi" → "tech-lo-fi".
 */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Musical key helpers (Camelot wheel) ──────────────────────
// Major keys sit on the outer "B" ring, minor keys on the inner "A" ring.
const CAMELOT_MAJOR: Record<string, number> = {
  B: 1, 'F#': 2, Gb: 2, Db: 3, 'C#': 3, Ab: 4, 'G#': 4, Eb: 5, 'D#': 5, Bb: 6, 'A#': 6,
  F: 7, C: 8, G: 9, D: 10, A: 11, E: 12,
};
const CAMELOT_MINOR: Record<string, number> = {
  'G#': 1, Ab: 1, 'D#': 2, Eb: 2, Bb: 3, 'A#': 3, F: 4, C: 5, G: 6, D: 7,
  A: 8, E: 9, B: 10, 'F#': 11, Gb: 11, 'C#': 12, Db: 12,
};

export interface KeyInfo {
  camelot: string | null; // e.g. "8A"
  short: string;          // e.g. "Am" / "D"
}

/** Parses "D Major" / "A Minor" / "F# minor" into Camelot code + short name. */
export function parseMusicalKey(musicalKey: string): KeyInfo {
  const match = musicalKey.trim().match(/^([A-Ga-g])([#b]?)\s*(major|minor|maj|min|m)?/i);
  if (!match) return { camelot: null, short: musicalKey };
  const root = match[1].toUpperCase() + match[2];
  const mode = (match[3] || 'major').toLowerCase();
  const isMinor = mode === 'minor' || mode === 'min' || mode === 'm';
  const num = (isMinor ? CAMELOT_MINOR : CAMELOT_MAJOR)[root];
  return {
    camelot: num ? `${num}${isMinor ? 'A' : 'B'}` : null,
    short: `${root}${isMinor ? 'm' : ''}`,
  };
}

/** Rights clearance label derived from the PRO affiliation string. */
export function rightsLabel(proAffiliation?: string): string {
  return proAffiliation && proAffiliation.includes('100%') ? '100% One-Stop' : 'Pre-Cleared';
}

/** Summary figures for a set of tracks, used in hub page headers. */
export function catalogStats(tracks: { bpm: number; musicalKey: string; stems?: unknown[]; altMixes?: unknown[] }[]) {
  const bpms = tracks.map(t => t.bpm);
  const lo = Math.min(...bpms);
  const hi = Math.max(...bpms);
  const keys = new Set(tracks.map(t => t.musicalKey)).size;
  const stems = tracks.reduce((n, t) => n + (t.stems?.length ?? 0), 0);
  return [
    { value: String(tracks.length), label: tracks.length === 1 ? 'Track' : 'Tracks' },
    { value: lo === hi ? String(lo) : `${lo}–${hi}`, label: 'BPM range' },
    { value: String(keys), label: keys === 1 ? 'Musical key' : 'Musical keys' },
    { value: String(stems), label: 'Isolated stems' },
  ];
}

/** Plain-text excerpt for meta descriptions: strips **markup**, collapses whitespace, cuts on a word boundary. */
export function excerpt(text: string, max: number): string {
  const clean = (text || '').replace(/\*\*/g, '').replace(/^\s*[-*•]\s+/gm, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

/** "tech corporate background music" → "Tech Corporate Background Music" (keeps existing capitals like "SaaS"). */
export function titleCase(text: string): string {
  return text.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

/** Makes a site-relative asset path absolute; leaves full URLs untouched. */
export function absoluteUrl(pathOrUrl: string, siteUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/**
 * Only the production deployment may be indexed. On Vercel, Preview/Development
 * deployments (staging) are noindex automatically; on other hosts set NOINDEX=true
 * for staging.
 */
export function isIndexable(): boolean {
  if (process.env.NOINDEX === 'true') return false;
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === 'production';
  return true;
}
