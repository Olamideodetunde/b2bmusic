import { Pool } from 'pg';
import type { Track } from './types';
import type { TrackRepository } from './repository';
import { PostgresRepository } from './postgres';
import { FileRepository } from './file-store';
import { toSlug } from '../utils';
import type { BpmBand } from '../catalog/taxonomy';

/**
 * Storage selection:
 *   DATABASE_URL set  → Postgres (Neon in production; use the *pooled* connection string)
 *   DATABASE_URL unset → local JSON store in .data/ (development only)
 */
const globalForDb = globalThis as unknown as { __b2bPool?: Pool; __b2bRepo?: TrackRepository };

export function getRepository(): TrackRepository {
  if (globalForDb.__b2bRepo) return globalForDb.__b2bRepo;

  const url = process.env.DATABASE_URL;
  if (url) {
    // Reused across hot reloads and warm serverless invocations.
    globalForDb.__b2bPool ??= new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10_000 });
    globalForDb.__b2bRepo = new PostgresRepository(globalForDb.__b2bPool);
  } else {
    globalForDb.__b2bRepo = new FileRepository();
  }
  return globalForDb.__b2bRepo;
}

/** For tests: inject a repository (e.g. Postgres backed by PGlite). */
export function setRepositoryForTesting(repo: TrackRepository | undefined) {
  globalForDb.__b2bRepo = repo;
}

// ─── Read helpers used by pages ─────────────────────────────────────

export async function getAllTracks(): Promise<Track[]> {
  return getRepository().listPublished();
}

export async function getTrackBySlug(slug: string): Promise<Track | null> {
  const track = await getRepository().findBySlug(slug);
  return track?.isPublished ? track : null;
}

export async function getTracksByIds(ids: number[]): Promise<Track[]> {
  return getRepository().findByIds(ids);
}

/** Accepts a URL slug ("folk-and-acoustic") or a display name ("Folk & Acoustic"). */
export async function getTracksByGenre(genre: string): Promise<Track[]> {
  const input = genre.toLowerCase();
  return (await getAllTracks()).filter(t => t.genre.toLowerCase() === input || toSlug(t.genre) === input);
}

export async function getTracksByUseCase(useCase: string): Promise<Track[]> {
  const input = toSlug(useCase);
  return (await getAllTracks()).filter(t => t.useCases.some(u => toSlug(u) === input));
}

export async function getTracksByBpmBand(band: BpmBand): Promise<Track[]> {
  return (await getAllTracks()).filter(t => t.bpm >= band.min && t.bpm <= band.max);
}
