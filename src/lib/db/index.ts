import { neon } from '@neondatabase/serverless';
import { initialTracks } from './mock-data';
import { Track, IngestTrackPayload } from './types';
import { makeUniqueSlug } from '../seo/slugify';

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
      return {
        ...r,
        agencyPriceCents: r.agencyPriceCents || 2000,
        altMixes: r.altMixes || match?.altMixes || [],
        stems: r.stems || match?.stems || [],
        syncMeta: r.syncMeta || match?.syncMeta || {
          composer: "B2B Production Team",
          publisher: "B2B Syncworks (BMI)",
          proAffiliation: "BMI (100% Direct Pre-Cleared)",
          isrc: `US-B2B-26-${r.id.toString().padStart(5, '0')}`,
          energyLevel: "Medium",
          instrumentation: ["Analog Synths", "Acoustic Elements"],
          soundPalette: ["Commercial", "Mastered 24-bit"],
          tempoDescriptor: `${r.bpm} BPM Steady`
        }
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

/**
 * Ingest or update a track (Called by Make.com webhook)
 */
export async function upsertTrackFromIngest(payload: IngestTrackPayload): Promise<Track> {
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
  
  const slugSource = payload.targetKeyword || payload.title;
  const slug = makeUniqueSlug(slugSource, existingSlugs);

  const durationSeconds = payload.durationSeconds || 150;
  const standardPriceCents = payload.standardPriceCents || 1000;
  const agencyPriceCents = payload.agencyPriceCents || 2000;
  const broadcastPriceCents = payload.broadcastPriceCents || 4000;

  const newTrack: Track = {
    id: localTracksStore.length + 1,
    title: payload.title,
    slug,
    targetKeyword: payload.targetKeyword,
    bpm: payload.bpm,
    musicalKey: payload.musicalKey,
    genre: payload.genre,
    moods,
    useCases,
    description: payload.description,
    previewAudioUrl: payload.previewAudioUrl,
    fullAudioUrl: payload.fullAudioUrl,
    coverImageUrl: payload.coverImageUrl || "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
    durationSeconds,
    standardPriceCents,
    agencyPriceCents,
    broadcastPriceCents,
    isPublished: true,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    altMixes: payload.altMixes || [
      { id: `${slug}-full`, name: "Full Master Mix", type: "full", durationSeconds, audioUrl: payload.previewAudioUrl },
      { id: `${slug}-under`, name: "Underscore (No Melodic Lead)", type: "underscore", durationSeconds, audioUrl: payload.previewAudioUrl },
      { id: `${slug}-ambient`, name: "Drumless Ambient Bed", type: "drumless", durationSeconds, audioUrl: payload.previewAudioUrl },
      { id: `${slug}-60s`, name: "60s Broadcast Cut", type: "60s", durationSeconds: 60, audioUrl: payload.previewAudioUrl },
      { id: `${slug}-30s`, name: "30s Commercial Cut", type: "30s", durationSeconds: 30, audioUrl: payload.previewAudioUrl }
    ],
    stems: payload.stems || [
      { name: "01_Drums_and_Percussion.wav", category: "Drums", format: "WAV 24-bit / 48kHz" },
      { name: "02_Bassline.wav", category: "Bass", format: "WAV 24-bit / 48kHz" },
      { name: "03_Synths_and_Keys.wav", category: "Synths & Guitars", format: "WAV 24-bit / 48kHz" },
      { name: "04_Sound_Design_FX.wav", category: "FX & Risers", format: "WAV 24-bit / 48kHz" },
      { name: "05_Full_Stereo_Master.wav", category: "Master", format: "WAV 24-bit / 48kHz" }
    ],
    syncMeta: {
      composer: payload.syncMeta?.composer || "B2B Staff Composer",
      publisher: payload.syncMeta?.publisher || "B2B Production Music Sync (BMI)",
      proAffiliation: payload.syncMeta?.proAffiliation || "BMI (100% Direct Pre-Cleared)",
      isrc: payload.syncMeta?.isrc || `US-B2B-26-${Math.floor(10000 + Math.random() * 90000)}`,
      energyLevel: (payload.syncMeta?.energyLevel as any) || "Medium",
      instrumentation: payload.syncMeta?.instrumentation || ["Analog Synthesizers", "Percussion", "Bass"],
      soundPalette: payload.syncMeta?.soundPalette || ["Broadcast Ready", "Dynamic"],
      tempoDescriptor: payload.syncMeta?.tempoDescriptor || `${payload.bpm} BPM`
    }
  };

  // Persist to Neon Postgres when DATABASE_URL is configured
  const sql = getDatabaseClient();
  if (sql) {
    try {
      const [inserted] = await sql`
        INSERT INTO tracks (
          title, slug, target_keyword, bpm, musical_key, genre, moods, use_cases,
          description, preview_audio_url, full_audio_url, cover_image_url,
          duration_seconds, standard_price_cents, agency_price_cents, broadcast_price_cents,
          alt_mixes, stems, sync_meta, is_published
        ) VALUES (
          ${newTrack.title}, ${newTrack.slug}, ${newTrack.targetKeyword}, ${newTrack.bpm},
          ${newTrack.musicalKey}, ${newTrack.genre}, ${JSON.stringify(newTrack.moods)},
          ${JSON.stringify(newTrack.useCases)}, ${newTrack.description}, ${newTrack.previewAudioUrl},
          ${newTrack.fullAudioUrl || null}, ${newTrack.coverImageUrl || null}, ${newTrack.durationSeconds},
          ${newTrack.standardPriceCents}, ${newTrack.agencyPriceCents}, ${newTrack.broadcastPriceCents},
          ${JSON.stringify(newTrack.altMixes)}, ${JSON.stringify(newTrack.stems)},
          ${JSON.stringify(newTrack.syncMeta)}, ${newTrack.isPublished}
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
        RETURNING id
      `;
      if (inserted?.id) {
        newTrack.id = inserted.id;
      }
    } catch (neonErr) {
      console.warn("Neon insert warning, maintaining in-memory track copy:", neonErr);
    }
  }

  saveCachedIngestedTrack(newTrack);
  localTracksStore.unshift(newTrack);
  return newTrack;
}
