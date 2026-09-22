import { neon } from '@neondatabase/serverless';
import { initialTracks } from './mock-data';
import { Track, IngestTrackPayload, SyncMeta } from './types';
import { makeUniqueSlug, generateSlug } from '../seo/slugify';

import fs from 'fs';
import path from 'path';

// In-memory runtime cache for development or when DATABASE_URL is not yet provided
let localTracksStore: Track[] = [...initialTracks];

const CACHE_FILE = path.join(process.cwd(), '.next', 'ingested-tracks.json');

function getCachedIngestedTracks(): Track[] {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {}
  return [];
}

function saveCachedIngestedTrack(track: Track) {
  try {
    const existing = getCachedIngestedTracks();
    const idx = existing.findIndex(t => t.slug === track.slug);
    if (idx >= 0) {
      existing[idx] = track;
    } else {
      existing.unshift(track);
    }
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(existing, null, 2), 'utf-8');
  } catch (e) {}
}

function getDatabaseClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes('ep-sample-123456')) {
    return null;
  }
  return neon(connectionString);
}

/**
 * Fetch all published tracks
 */
export async function getAllTracks(): Promise<Track[]> {
  const sql = getDatabaseClient();
  if (!sql) {
    const cached = getCachedIngestedTracks();
    const map = new Map<string, Track>();
    // Add cached ingested tracks
    cached.forEach(t => map.set(t.slug, t));
    // Add initial base tracks
    localTracksStore.forEach(t => {
      if (!map.has(t.slug)) map.set(t.slug, t);
    });
    return Array.from(map.values()).filter(t => t.isPublished);
  }

  try {
    const rows = await sql`
      SELECT 
        id, title, slug, target_keyword as "targetKeyword", bpm,
        musical_key as "musicalKey", genre, moods, use_cases as "useCases",
        description, preview_audio_url as "previewAudioUrl",
        full_audio_url as "fullAudioUrl", cover_image_url as "coverImageUrl",
        duration_seconds as "durationSeconds", standard_price_cents as "standardPriceCents",
        agency_price_cents as "agencyPriceCents", broadcast_price_cents as "broadcastPriceCents",
        alt_mixes as "altMixes", stems as "stems", sync_meta as "syncMeta",
        stripe_product_id as "stripeProductId",
        is_published as "isPublished", published_at as "publishedAt", updated_at as "updatedAt"
      FROM tracks
      WHERE is_published = true
      ORDER BY id DESC
    `;
    
    // Enrich with default fallback sync meta if queried from legacy DB schema
    return rows.map((r: any) => {
      const match = localTracksStore.find(t => t.slug === r.slug);

      const defaultSyncMeta = {
        composer: "B2B Production Team",
        publisher: "B2B Syncworks (BMI)",
        proAffiliation: "BMI (100% Direct Pre-Cleared)",
        isrc: `US-B2B-26-${r.id.toString().padStart(5, '0')}`,
        energyLevel: "Medium",
        instrumentation: ["Analog Synths", "Acoustic Elements"],
        soundPalette: ["Commercial", "Mastered 24-bit"],
        tempoDescriptor: `${r.bpm} BPM Steady`
      };

      const baseSyncMeta = match?.syncMeta || defaultSyncMeta;
      const rawMeta = r.syncMeta && typeof r.syncMeta === 'object' ? r.syncMeta : {};

      const syncMeta: SyncMeta = {
        composer: rawMeta.composer || baseSyncMeta.composer,
        publisher: rawMeta.publisher || baseSyncMeta.publisher,
        proAffiliation: rawMeta.proAffiliation || baseSyncMeta.proAffiliation,
        isrc: rawMeta.isrc || baseSyncMeta.isrc,
        energyLevel: rawMeta.energyLevel || baseSyncMeta.energyLevel,
        instrumentation: Array.isArray(rawMeta.instrumentation) && rawMeta.instrumentation.length > 0
          ? rawMeta.instrumentation
          : (baseSyncMeta.instrumentation || ["Analog Synths", "Acoustic Elements"]),
        soundPalette: Array.isArray(rawMeta.soundPalette) && rawMeta.soundPalette.length > 0
          ? rawMeta.soundPalette
          : (baseSyncMeta.soundPalette || ["Commercial", "Mastered 24-bit"]),
        tempoDescriptor: rawMeta.tempoDescriptor || baseSyncMeta.tempoDescriptor || `${r.bpm} BPM Steady`
      };

      const altMixes = Array.isArray(r.altMixes) && r.altMixes.length > 0
        ? r.altMixes
        : (match?.altMixes || [
            { name: "Full Master", duration: r.durationSeconds || 120, url: r.previewAudioUrl },
            { name: "Underscore (No Lead)", duration: r.durationSeconds || 120, url: r.previewAudioUrl },
            { name: "60-Sec Broadcast Cut", duration: 60, url: r.previewAudioUrl },
            { name: "30-Sec Social Cut", duration: 30, url: r.previewAudioUrl }
          ]);

      const stems = Array.isArray(r.stems) && r.stems.length > 0
        ? r.stems
        : (match?.stems || ["01_Drums.wav", "02_Bass.wav", "03_Synths_Keys.wav", "04_FX_Atmosphere.wav", "05_Master_Mix.wav"]);

      const moods = Array.isArray(r.moods) && r.moods.length > 0
        ? r.moods
        : (match?.moods || ["Commercial", "Pre-Cleared"]);

      const useCases = Array.isArray(r.useCases) && r.useCases.length > 0
        ? r.useCases
        : (match?.useCases || ["Commercial Video", "Social Campaign"]);

      return {
        ...r,
        agencyPriceCents: r.agencyPriceCents || 2000,
        moods,
        useCases,
        altMixes,
        stems,
        syncMeta
      } as Track;
    });
  } catch (error) {
    console.warn("Neon DB query failed, falling back to local dataset:", error);
    return localTracksStore.filter(t => t.isPublished);
  }
}

/**
 * Get track by SEO slug
 */
export async function getTrackBySlug(slug: string): Promise<Track | null> {
  const all = await getAllTracks();
  return all.find(t => t.slug === slug && t.isPublished) || null;
}

/**
 * Get tracks by Genre (for hub pages)
 */
export async function getTracksByGenre(genre: string): Promise<Track[]> {
  const all = await getAllTracks();
  const normalized = genre.toLowerCase().replace(/-/g, ' ');
  return all.filter(t => t.genre.toLowerCase() === normalized);
}

/**
 * Get tracks by Use Case (for hub pages)
 */
export async function getTracksByUseCase(useCase: string): Promise<Track[]> {
  const all = await getAllTracks();
  const normalized = useCase.toLowerCase().replace(/-/g, ' ');
  return all.filter(t => 
    t.useCases.some(u => u.toLowerCase() === normalized || u.toLowerCase().includes(normalized))
  );
}

export interface UpsertResult {
  track: Track;
  isUpdate: boolean;
}

/**
 * Ingest or update a track with guaranteed idempotency (Called by Make.com webhook)
 * If the track already exists (matched by slug, id, targetKeyword, or exact title),
 * it updates the existing record and preserves the live URL slug (no duplicates).
 */
export async function upsertTrackFromIngest(payload: IngestTrackPayload): Promise<UpsertResult> {
  const moods = Array.isArray(payload.moods) 
    ? payload.moods 
    : typeof payload.moods === 'string' 
      ? payload.moods.split(',').map(s => s.trim()).filter(Boolean)
      : [];

  const useCases = Array.isArray(payload.useCases)
    ? payload.useCases
    : typeof payload.useCases === 'string'
      ? payload.useCases.split(',').map(s => s.trim()).filter(Boolean)
      : [];

  const allExisting = await getAllTracks();
  const existingSlugs = allExisting.map(t => t.slug);

  const candidateSlug = payload.slug ? generateSlug(payload.slug) : null;
  const keywordSlug = payload.targetKeyword ? generateSlug(payload.targetKeyword) : null;
  const normalizedTitle = payload.title.toLowerCase().trim();

  // IDEMPOTENCY CHECK:
  // Detect if this track row already exists in the catalog:
  // 1. Explicit ID match
  // 2. Explicit slug match
  // 3. Keyword slug match
  // 4. Exact title match
  const existingTrack = allExisting.find(t => 
    (payload.id && t.id === payload.id) ||
    (candidateSlug && t.slug === candidateSlug) ||
    (keywordSlug && t.slug === keywordSlug) ||
    (t.title.toLowerCase().trim() === normalizedTitle)
  );

  const isUpdate = Boolean(existingTrack);

  // Preserve existing slug on update so live URL never breaks or creates a duplicate!
  let slug: string;
  if (existingTrack) {
    slug = existingTrack.slug;
  } else if (candidateSlug && !existingSlugs.includes(candidateSlug)) {
    slug = candidateSlug;
  } else {
    const slugSource = payload.targetKeyword || payload.title;
    slug = makeUniqueSlug(slugSource, existingSlugs);
  }

  const durationSeconds = payload.durationSeconds || existingTrack?.durationSeconds || 150;
  const standardPriceCents = payload.standardPriceCents || existingTrack?.standardPriceCents || 1000;
  const agencyPriceCents = payload.agencyPriceCents || existingTrack?.agencyPriceCents || 2000;
  const broadcastPriceCents = payload.broadcastPriceCents || existingTrack?.broadcastPriceCents || 4000;
  const publishedAt = existingTrack?.publishedAt || new Date().toISOString();
  const updatedAt = new Date().toISOString();

  const trackData: Track = {
    id: existingTrack ? existingTrack.id : localTracksStore.length + 1,
    title: payload.title,
    slug,
    targetKeyword: payload.targetKeyword,
    bpm: payload.bpm,
    musicalKey: payload.musicalKey,
    genre: payload.genre,
    moods: moods.length > 0 ? moods : (existingTrack?.moods || ["Commercial", "Pre-Cleared"]),
    useCases: useCases.length > 0 ? useCases : (existingTrack?.useCases || ["Commercial Video", "Social Campaign"]),
    description: payload.description,
    previewAudioUrl: payload.previewAudioUrl,
    fullAudioUrl: payload.fullAudioUrl || existingTrack?.fullAudioUrl,
    coverImageUrl: payload.coverImageUrl || existingTrack?.coverImageUrl || "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
    durationSeconds,
    standardPriceCents,
    agencyPriceCents,
    broadcastPriceCents,
    isPublished: true,
    publishedAt,
    updatedAt,
    altMixes: payload.altMixes || existingTrack?.altMixes || [
      { id: `${slug}-full`, name: "Full Master Mix", type: "full", durationSeconds, audioUrl: payload.previewAudioUrl },
      { id: `${slug}-under`, name: "Underscore (No Melodic Lead)", type: "underscore", durationSeconds, audioUrl: payload.previewAudioUrl },
      { id: `${slug}-ambient`, name: "Drumless Ambient Bed", type: "drumless", durationSeconds, audioUrl: payload.previewAudioUrl },
      { id: `${slug}-60s`, name: "60s Broadcast Cut", type: "60s", durationSeconds: 60, audioUrl: payload.previewAudioUrl },
      { id: `${slug}-30s`, name: "30s Commercial Cut", type: "30s", durationSeconds: 30, audioUrl: payload.previewAudioUrl }
    ],
    stems: payload.stems || existingTrack?.stems || [
      { name: "01_Drums_and_Percussion.wav", category: "Drums", format: "WAV 24-bit / 48kHz" },
      { name: "02_Bassline.wav", category: "Bass", format: "WAV 24-bit / 48kHz" },
      { name: "03_Synths_and_Keys.wav", category: "Synths & Guitars", format: "WAV 24-bit / 48kHz" },
      { name: "04_Sound_Design_FX.wav", category: "FX & Risers", format: "WAV 24-bit / 48kHz" },
      { name: "05_Full_Stereo_Master.wav", category: "Master", format: "WAV 24-bit / 48kHz" }
    ],
    syncMeta: {
      composer: payload.syncMeta?.composer || existingTrack?.syncMeta?.composer || "B2B Staff Composer",
      publisher: payload.syncMeta?.publisher || existingTrack?.syncMeta?.publisher || "B2B Production Music Sync (BMI)",
      proAffiliation: payload.syncMeta?.proAffiliation || existingTrack?.syncMeta?.proAffiliation || "BMI (100% Direct Pre-Cleared)",
      isrc: payload.syncMeta?.isrc || existingTrack?.syncMeta?.isrc || `US-B2B-26-${Math.floor(10000 + Math.random() * 90000)}`,
      energyLevel: (payload.syncMeta?.energyLevel as any) || existingTrack?.syncMeta?.energyLevel || "Medium",
      instrumentation: payload.syncMeta?.instrumentation || existingTrack?.syncMeta?.instrumentation || ["Analog Synthesizers", "Percussion", "Bass"],
      soundPalette: payload.syncMeta?.soundPalette || existingTrack?.syncMeta?.soundPalette || ["Broadcast Ready", "Dynamic"],
      tempoDescriptor: payload.syncMeta?.tempoDescriptor || existingTrack?.syncMeta?.tempoDescriptor || `${payload.bpm} BPM`
    }
  };

  // Persist to Neon Postgres when DATABASE_URL is configured
  const sql = getDatabaseClient();
  if (sql) {
    try {
      const [record] = await sql`
        INSERT INTO tracks (
          title, slug, target_keyword, bpm, musical_key, genre, moods, use_cases,
          description, preview_audio_url, full_audio_url, cover_image_url,
          duration_seconds, standard_price_cents, agency_price_cents, broadcast_price_cents,
          alt_mixes, stems, sync_meta, is_published, published_at, updated_at
        ) VALUES (
          ${trackData.title}, ${trackData.slug}, ${trackData.targetKeyword}, ${trackData.bpm},
          ${trackData.musicalKey}, ${trackData.genre}, ${JSON.stringify(trackData.moods)},
          ${JSON.stringify(trackData.useCases)}, ${trackData.description}, ${trackData.previewAudioUrl},
          ${trackData.fullAudioUrl || null}, ${trackData.coverImageUrl || null}, ${trackData.durationSeconds},
          ${trackData.standardPriceCents}, ${trackData.agencyPriceCents}, ${trackData.broadcastPriceCents},
          ${JSON.stringify(trackData.altMixes)}, ${JSON.stringify(trackData.stems)},
          ${JSON.stringify(trackData.syncMeta)}, ${trackData.isPublished},
          ${publishedAt}, ${updatedAt}
        )
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          target_keyword = EXCLUDED.target_keyword,
          bpm = EXCLUDED.bpm,
          musical_key = EXCLUDED.musical_key,
          genre = EXCLUDED.genre,
          moods = EXCLUDED.moods,
          use_cases = EXCLUDED.use_cases,
          description = EXCLUDED.description,
          preview_audio_url = EXCLUDED.preview_audio_url,
          full_audio_url = EXCLUDED.full_audio_url,
          cover_image_url = EXCLUDED.cover_image_url,
          duration_seconds = EXCLUDED.duration_seconds,
          standard_price_cents = EXCLUDED.standard_price_cents,
          agency_price_cents = EXCLUDED.agency_price_cents,
          broadcast_price_cents = EXCLUDED.broadcast_price_cents,
          alt_mixes = EXCLUDED.alt_mixes,
          stems = EXCLUDED.stems,
          sync_meta = EXCLUDED.sync_meta,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, published_at as "publishedAt", updated_at as "updatedAt"
      `;
      if (record?.id) {
        trackData.id = record.id;
        if (record.publishedAt) trackData.publishedAt = record.publishedAt;
        if (record.updatedAt) trackData.updatedAt = record.updatedAt;
      }
    } catch (neonErr) {
      console.warn("Neon upsert warning, maintaining in-memory track copy:", neonErr);
    }
  }

  saveCachedIngestedTrack(trackData);
  const localIndex = localTracksStore.findIndex(t => t.slug === trackData.slug || t.id === trackData.id);
  if (localIndex >= 0) {
    localTracksStore[localIndex] = trackData;
  } else {
    localTracksStore.unshift(trackData);
  }

  return { track: trackData, isUpdate };
}
