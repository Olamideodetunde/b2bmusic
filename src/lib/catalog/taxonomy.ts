/**
 * Catalog taxonomy — mirrors the dropdowns in the Google Sheet master index
 * ("Track Index" tab, columns C and O). Change these here AND in the sheet's
 * data-validation rules together, or the API will reject rows.
 */

export const GENRES = [
  'Electronic',
  'Cinematic',
  'Corporate / Tech',
  'Hip Hop',
  'Indie Rock',
  'Folk & Acoustic',
  'Ambient',
] as const;

export type Genre = (typeof GENRES)[number];

export const SHEET_STATUSES = ['Draft', 'Ready', 'Published', 'Error'] as const;
export type SheetStatus = (typeof SHEET_STATUSES)[number];

/** Tempo hubs. Bands match the catalog filter presets (Slow / Mid / Fast). */
export const BPM_BANDS = [
  { slug: 'under-90-bpm', label: 'Under 90 BPM', short: 'Slow', min: 0, max: 89, description: 'Downtempo beds for voiceover, documentary and reflective storytelling.' },
  { slug: '90-124-bpm', label: '90–124 BPM', short: 'Mid-tempo', min: 90, max: 124, description: 'Steady, forward-moving tempos for explainers, brand films and keynotes.' },
  { slug: '125-plus-bpm', label: '125+ BPM', short: 'Fast', min: 125, max: 999, description: 'High-energy tempos for commercials, sports promos and product launches.' },
] as const;

export type BpmBand = (typeof BPM_BANDS)[number];

export function bpmBandFor(bpm: number): BpmBand {
  return BPM_BANDS.find(b => bpm >= b.min && bpm <= b.max) ?? BPM_BANDS[BPM_BANDS.length - 1];
}

export function findBpmBand(slug: string): BpmBand | undefined {
  return BPM_BANDS.find(b => b.slug === slug);
}

/** Case-insensitive match against the allowed genre list; returns the canonical spelling. */
export function canonicalGenre(input: string): Genre | null {
  const needle = input.trim().toLowerCase();
  return GENRES.find(g => g.toLowerCase() === needle) ?? null;
}
