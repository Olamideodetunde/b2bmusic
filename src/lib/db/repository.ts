import type { Order, PublishEvent, Track, TrackInput } from './types';

/**
 * Storage contract. Business rules (validation, slugs, duplicate handling) live in
 * src/lib/ingest/service.ts and only talk to this interface, so the Postgres and
 * local-file implementations can never disagree on behaviour.
 */
export interface TrackRepository {
  readonly kind: 'postgres' | 'file';

  listPublished(): Promise<Track[]>;
  findById(id: number): Promise<Track | null>;
  findByIds(ids: number[]): Promise<Track[]>;
  findBySlug(slug: string): Promise<Track | null>;
  /** Used to make create requests without a Track ID idempotent. */
  findByKeywordAndTitle(targetKeyword: string, title: string): Promise<Track | null>;
  /** Tracks already targeting this keyword (case-insensitive) — keyword cannibalization check. */
  findByTargetKeyword(targetKeyword: string): Promise<Track[]>;
  /** A track with this exact description, if any — duplicate-content ("doorway page") check. */
  findByDescription(description: string): Promise<Track | null>;
  /** Published-track count per genre — drives nav/footer and layout revalidation. */
  genreCounts(): Promise<Record<string, number>>;
  /** Every slug equal to `base` or `base-<n>` — for picking the next free suffix. */
  slugsLike(base: string): Promise<string[]>;

  /** Throws SlugConflictError if the slug was taken concurrently. */
  insert(input: TrackInput, slug: string): Promise<Track>;
  update(id: number, input: TrackInput): Promise<Track>;

  logEvent(event: {
    trackId: number | null;
    action: PublishEvent['action'];
    ok: boolean;
    message: string;
    payload?: unknown;
  }): Promise<void>;
  recentEvents(limit: number): Promise<PublishEvent[]>;

  /** Idempotent on stripeSessionId — returns false if the order already existed. */
  createOrder(order: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<boolean>;
  /** Marks a paid order refunded. Returns false if there is no such order or it was already refunded. */
  markOrderRefunded(stripeSessionId: string): Promise<boolean>;
}

export class SlugConflictError extends Error {
  constructor(public readonly slug: string) {
    super(`Slug "${slug}" is already taken`);
    this.name = 'SlugConflictError';
  }
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not set — writes are disabled. Configure Neon (see README → Environment).');
    this.name = 'StorageNotConfiguredError';
  }
}
