/**
 * License tiers. Keys match the sheet's price columns:
 *   Standard Price → standard · Commercial Price → commercial · Broadcast Price → broadcast
 * Used by the checkout UI, the checkout API, structured data, pricing page and emails.
 */

export const LICENSE_TIERS = [
  {
    key: 'standard',
    name: 'Standard',
    label: 'Web & Social',
    summary: 'YouTube, podcasts, social and internal corporate video.',
    features: ['Unlimited online views & streams', 'Master 24-bit WAV & 320kbps MP3', 'YouTube Content ID whitelisting'],
    scope: 'Single project · online & social only',
  },
  {
    key: 'commercial',
    name: 'Commercial',
    label: 'Commercial & Ads',
    summary: 'Client projects, paid digital ads, trade shows and promos.',
    features: ['All Standard rights + paid digital ads', 'Isolated stems archive', 'All alt-mixes & cutdowns (:60 / :30 / :15)', 'Agency client transfer permitted'],
    scope: 'Client handover permitted',
  },
  {
    key: 'broadcast',
    name: 'Broadcast',
    label: 'Broadcast, TV & Film',
    summary: 'Linear TV, OTT streaming, theatrical film and games.',
    features: ['Worldwide TV & OTT synchronization', 'Unlimited media spend', 'Stems + all broadcast cuts', 'Full legal indemnification & cue-sheet filing'],
    scope: 'Unlimited usage · worldwide · perpetual',
  },
] as const;

export type LicenseTierKey = (typeof LICENSE_TIERS)[number]['key'];

export function isLicenseTier(value: unknown): value is LicenseTierKey {
  return LICENSE_TIERS.some(t => t.key === value);
}

export function tierInfo(key: LicenseTierKey) {
  return LICENSE_TIERS.find(t => t.key === key)!;
}

export function tierPriceCents(
  track: { standardPriceCents: number; commercialPriceCents: number; broadcastPriceCents: number },
  key: LicenseTierKey,
): number {
  switch (key) {
    case 'standard': return track.standardPriceCents;
    case 'commercial': return track.commercialPriceCents;
    case 'broadcast': return track.broadcastPriceCents;
  }
}
