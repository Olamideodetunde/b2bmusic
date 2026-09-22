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
  proAffiliation: string; // e.g. "BMI (Direct Sync Cleared)"
  isrc: string;
  energyLevel: 'Subtle' | 'Medium' | 'High' | 'Explosive';
  instrumentation: string[];
  soundPalette: string[];
  tempoDescriptor: string; // e.g. "Driving & Steady", "Reflective Downtempo"
}

export interface Track {
  id: number;
  title: string;
  slug: string;
  targetKeyword: string;
  bpm: number;
  musicalKey: string;
  genre: string;
  moods: string[];
  useCases: string[];
  description: string;
  previewAudioUrl: string;
  fullAudioUrl?: string;
  coverImageUrl?: string;
  durationSeconds: number;
  standardPriceCents: number;
  agencyPriceCents: number;
  broadcastPriceCents: number;
  stripeProductId?: string;
  isPublished: boolean;
  publishedAt: string;
  updatedAt: string;
  
  // Pro sync & broadcast deliverables (ALIBI / Musicbed / Audiio standards)
  altMixes: AltMix[];
  stems: StemTrack[];
  syncMeta: SyncMeta;
}

export interface IngestTrackPayload {
  id?: number;
  slug?: string;
  title: string;
  targetKeyword: string;
  bpm: number;
  musicalKey: string;
  genre: string;
  moods?: string[] | string;
  useCases?: string[] | string;
  description: string;
  previewAudioUrl: string;
  fullAudioUrl?: string;
  coverImageUrl?: string;
  durationSeconds?: number;
  standardPriceCents?: number;
  agencyPriceCents?: number;
  broadcastPriceCents?: number;
  altMixes?: AltMix[];
  stems?: StemTrack[];
  syncMeta?: Partial<SyncMeta>;
}
