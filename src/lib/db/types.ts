export interface AltMix {
  id: string;
  name: string;
  type: 'full' | 'underscore' | 'drumless' | '60s' | '30s' | '15s';
  durationSeconds: number;
  audioUrl: string;
}

export interface StemTrack {
  name: string;
  category: 'Drums' | 'Bass' | 'Synths & Guitars' | 'Acoustic Elements' | 'FX & Risers' | 'Master';
  format: string;
}

export interface SyncMeta {
  composer: string;
  publisher: string;
  proAffiliation: string; // e.g. "BMI (100% Direct Pre-Cleared)"
  isrc: string;
  energyLevel: 'Subtle' | 'Medium' | 'High' | 'Explosive';
  instrumentation: string[];
  soundPalette: string[];
  tempoDescriptor: string;
}

/**
 * A published track. The first block maps 1:1 to the Google Sheet "Track Index"
 * columns; the second block is optional enrichment (not in the sheet) that the
 * UI shows when present and hides when absent.
 */
export interface Track {
  // ── Sheet-driven (columns A–Q) ──
  id: number;                     // Track ID (Q) — assigned on first publish
  slug: string;                   // derived from Target Keyword; stable after publish
  title: string;                  // A
  targetKeyword: string;          // B
  genre: string;                  // C — one of GENRES
  bpm: number;                    // D
  musicalKey: string;             // E
  durationSeconds: number;        // F ("2:45" → 165)
  description: string;            // G
  moods: string[];                // H
  useCases: string[];             // I
  previewAudioUrl: string;        // J
  coverImageUrl?: string;         // K
  standardPriceCents: number;     // L
  commercialPriceCents: number;   // M
  broadcastPriceCents: number;    // N
  isPublished: boolean;
  publishedAt: string;
  updatedAt: string;

  // ── Optional enrichment ──
  fullAudioUrl?: string;
  vocalType?: 'instrumental' | 'female' | 'male';
  stripeProductId?: string;
  altMixes: AltMix[];
  stems: StemTrack[];
  syncMeta?: SyncMeta;
}

/** Validated, normalized input for creating or updating a track. */
export interface TrackInput {
  title: string;
  targetKeyword: string;
  genre: string;
  bpm: number;
  musicalKey: string;
  durationSeconds: number;
  description: string;
  moods: string[];
  useCases: string[];
  previewAudioUrl: string;
  coverImageUrl?: string;
  standardPriceCents: number;
  commercialPriceCents: number;
  broadcastPriceCents: number;
  fullAudioUrl?: string;
  vocalType?: Track['vocalType'];
  altMixes?: AltMix[];
  stems?: StemTrack[];
  syncMeta?: SyncMeta;
}

export interface PublishEvent {
  id: number;
  trackId: number | null;
  action: 'created' | 'updated' | 'rejected' | 'revalidated';
  ok: boolean;
  message: string;
  createdAt: string;
}

export interface Order {
  id: number;
  stripeSessionId: string;
  trackId: number;
  tier: string;
  amountCents: number;
  currency: string;
  customerEmail: string | null;
  status: 'paid' | 'refunded';
  createdAt: string;
}
