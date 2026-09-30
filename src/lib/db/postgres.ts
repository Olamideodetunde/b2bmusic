import type { DownloadVia, MasterFormat, Order, PublishEvent, Subscription, Track, TrackInput, User } from './types';
import { SlugConflictError, type TrackRepository } from './repository';

/**
 * Minimal query surface shared by `pg.Pool` (Neon / Railway / any Postgres in
 * production) and PGlite (in-process Postgres used by the test suite).
 */
export interface Queryable {
  query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
}

const TRACK_COLUMNS = `
  id, slug, title, target_keyword, genre, bpm, musical_key, duration_seconds, description,
  moods, use_cases, preview_audio_url, cover_image_url,
  standard_price_cents, commercial_price_cents, broadcast_price_cents,
  full_audio_url, master_wav_key, master_aiff_key, vocal_type, stripe_product_id, alt_mixes, stems, sync_meta,
  is_published, published_at, updated_at`;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));
const json = <T>(v: unknown, fallback: T): T => {
  if (v === null || v === undefined) return fallback;
  return (typeof v === 'string' ? JSON.parse(v) : v) as T;
};

const USER_COLUMNS = `id, email, stripe_customer_id, created_at`;

function toUser(r: Record<string, any>): User {
  return { id: Number(r.id), email: r.email, stripeCustomerId: r.stripe_customer_id ?? null, createdAt: iso(r.created_at) };
}

function toTrack(r: Record<string, any>): Track {
  return {
    id: Number(r.id),
    slug: r.slug,
    title: r.title,
    targetKeyword: r.target_keyword,
    genre: r.genre,
    bpm: Number(r.bpm),
    musicalKey: r.musical_key,
    durationSeconds: Number(r.duration_seconds),
    description: r.description,
    moods: r.moods ?? [],
    useCases: r.use_cases ?? [],
    previewAudioUrl: r.preview_audio_url,
    coverImageUrl: r.cover_image_url ?? undefined,
    standardPriceCents: Number(r.standard_price_cents),
    commercialPriceCents: Number(r.commercial_price_cents),
    broadcastPriceCents: Number(r.broadcast_price_cents),
    fullAudioUrl: r.full_audio_url ?? undefined,
    masterWavKey: r.master_wav_key ?? undefined,
    masterAiffKey: r.master_aiff_key ?? undefined,
    vocalType: r.vocal_type ?? undefined,
    stripeProductId: r.stripe_product_id ?? undefined,
    altMixes: json(r.alt_mixes, []),
    stems: json(r.stems, []),
    syncMeta: json(r.sync_meta, undefined),
    isPublished: Boolean(r.is_published),
    publishedAt: iso(r.published_at),
    updatedAt: iso(r.updated_at),
  };
}

/** Positional parameters shared by INSERT and UPDATE ($1–$21). */
function inputParams(t: TrackInput): unknown[] {
  return [
    t.title,
    t.targetKeyword,
    t.genre,
    t.bpm,
    t.musicalKey,
    t.durationSeconds,
    t.description,
    t.moods,
    t.useCases,
    t.previewAudioUrl,
    t.coverImageUrl ?? null,
    t.standardPriceCents,
    t.commercialPriceCents,
    t.broadcastPriceCents,
    t.fullAudioUrl ?? null,
    t.vocalType ?? null,
    // Enrichment is optional in the sheet; a row that omits it keeps what's stored.
    t.altMixes ? JSON.stringify(t.altMixes) : null,
    t.stems ? JSON.stringify(t.stems) : null,
    t.syncMeta ? JSON.stringify(t.syncMeta) : null,
    t.masterWavKey ?? null,
    t.masterAiffKey ?? null,
  ];
}

export class PostgresRepository implements TrackRepository {
  readonly kind = 'postgres' as const;

  constructor(private readonly db: Queryable) {}

  async listPublished(): Promise<Track[]> {
    const { rows } = await this.db.query(
      `SELECT ${TRACK_COLUMNS} FROM tracks WHERE is_published ORDER BY published_at DESC, id DESC`,
    );
    return rows.map(toTrack);
  }

  async findById(id: number): Promise<Track | null> {
    const { rows } = await this.db.query(`SELECT ${TRACK_COLUMNS} FROM tracks WHERE id = $1`, [id]);
    return rows[0] ? toTrack(rows[0]) : null;
  }

  async findByIds(ids: number[]): Promise<Track[]> {
    if (ids.length === 0) return [];
    const { rows } = await this.db.query(
      `SELECT ${TRACK_COLUMNS} FROM tracks WHERE is_published AND id = ANY($1::int[])`,
      [ids],
    );
    return rows.map(toTrack);
  }

  async findBySlug(slug: string): Promise<Track | null> {
    const { rows } = await this.db.query(`SELECT ${TRACK_COLUMNS} FROM tracks WHERE slug = $1`, [slug]);
    return rows[0] ? toTrack(rows[0]) : null;
  }

  async findByKeywordAndTitle(targetKeyword: string, title: string): Promise<Track | null> {
    const { rows } = await this.db.query(
      `SELECT ${TRACK_COLUMNS} FROM tracks
       WHERE lower(target_keyword) = lower($1) AND lower(title) = lower($2)
       ORDER BY id LIMIT 1`,
      [targetKeyword.trim(), title.trim()],
    );
    return rows[0] ? toTrack(rows[0]) : null;
  }

  async findByTargetKeyword(targetKeyword: string): Promise<Track[]> {
    const { rows } = await this.db.query(
      `SELECT ${TRACK_COLUMNS} FROM tracks WHERE lower(target_keyword) = lower($1) ORDER BY id`,
      [targetKeyword.trim()],
    );
    return rows.map(toTrack);
  }

  async findByDescription(description: string): Promise<Track | null> {
    const { rows } = await this.db.query(
      `SELECT ${TRACK_COLUMNS} FROM tracks WHERE md5(description) = md5($1) ORDER BY id LIMIT 1`,
      [description.trim()],
    );
    return rows[0] ? toTrack(rows[0]) : null;
  }

  async genreCounts(): Promise<Record<string, number>> {
    const { rows } = await this.db.query<{ genre: string; n: string | number }>(
      `SELECT genre, count(*) AS n FROM tracks WHERE is_published GROUP BY genre`,
    );
    return Object.fromEntries(rows.map(r => [r.genre, Number(r.n)]));
  }

  async slugsLike(base: string): Promise<string[]> {
    const { rows } = await this.db.query<{ slug: string }>(
      `SELECT slug FROM tracks WHERE slug = $1 OR slug ~ ('^' || $2 || '-[0-9]+$')`,
      [base, base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')],
    );
    return rows.map(r => r.slug);
  }

  async insert(input: TrackInput, slug: string): Promise<Track> {
    try {
      const { rows } = await this.db.query(
        `INSERT INTO tracks (
           title, target_keyword, genre, bpm, musical_key, duration_seconds, description,
           moods, use_cases, preview_audio_url, cover_image_url,
           standard_price_cents, commercial_price_cents, broadcast_price_cents,
           full_audio_url, vocal_type, alt_mixes, stems, sync_meta, master_wav_key, master_aiff_key, slug
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
           COALESCE($17::jsonb, '[]'::jsonb), COALESCE($18::jsonb, '[]'::jsonb), $19::jsonb, $20, $21, $22
         ) RETURNING ${TRACK_COLUMNS}`,
        [...inputParams(input), slug],
      );
      return toTrack(rows[0]);
    } catch (err: any) {
      if (err?.code === '23505' && String(err?.message ?? err?.detail ?? '').includes('slug')) {
        throw new SlugConflictError(slug);
      }
      throw err;
    }
  }

  async update(id: number, input: TrackInput): Promise<Track> {
    // Slug is deliberately NOT updated — the live URL must never change (sheet rule).
    const { rows } = await this.db.query(
      `UPDATE tracks SET
         title = $1, target_keyword = $2, genre = $3, bpm = $4, musical_key = $5,
         duration_seconds = $6, description = $7, moods = $8, use_cases = $9,
         preview_audio_url = $10, cover_image_url = $11,
         standard_price_cents = $12, commercial_price_cents = $13, broadcast_price_cents = $14,
         full_audio_url = COALESCE($15, full_audio_url),
         vocal_type = COALESCE($16, vocal_type),
         alt_mixes = COALESCE($17::jsonb, alt_mixes),
         stems = COALESCE($18::jsonb, stems),
         sync_meta = COALESCE($19::jsonb, sync_meta),
         master_wav_key = COALESCE($20, master_wav_key),
         master_aiff_key = COALESCE($21, master_aiff_key),
         is_published = TRUE,
         updated_at = now()
       WHERE id = $22
       RETURNING ${TRACK_COLUMNS}`,
      [...inputParams(input), id],
    );
    if (!rows[0]) throw new Error(`Track ${id} not found`);
    return toTrack(rows[0]);
  }

  async logEvent(e: { trackId: number | null; action: PublishEvent['action']; ok: boolean; message: string; payload?: unknown }) {
    await this.db.query(
      `INSERT INTO publish_events (track_id, action, ok, message, payload) VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [e.trackId, e.action, e.ok, e.message, e.payload === undefined ? null : JSON.stringify(e.payload)],
    );
  }

  async recentEvents(limit: number): Promise<PublishEvent[]> {
    const { rows } = await this.db.query(
      `SELECT id, track_id, action, ok, message, created_at FROM publish_events ORDER BY id DESC LIMIT $1`,
      [limit],
    );
    return rows.map((r: any) => ({
      id: Number(r.id),
      trackId: r.track_id === null ? null : Number(r.track_id),
      action: r.action,
      ok: Boolean(r.ok),
      message: r.message,
      createdAt: iso(r.created_at),
    }));
  }

  async createOrder(o: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<boolean> {
    const { rows } = await this.db.query(
      `INSERT INTO orders (stripe_session_id, track_id, tier, amount_cents, currency, customer_email)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (stripe_session_id) DO NOTHING
       RETURNING id`,
      [o.stripeSessionId, o.trackId, o.tier, o.amountCents, o.currency, o.customerEmail],
    );
    return rows.length > 0;
  }

  async markOrderRefunded(stripeSessionId: string): Promise<boolean> {
    const { rows } = await this.db.query(
      `UPDATE orders SET status = 'refunded' WHERE stripe_session_id = $1 AND status <> 'refunded' RETURNING id`,
      [stripeSessionId],
    );
    return rows.length > 0;
  }

  async purchasedTrackIds(email: string): Promise<number[]> {
    const { rows } = await this.db.query<{ track_id: number }>(
      `SELECT DISTINCT track_id FROM orders WHERE lower(customer_email) = lower($1) AND status = 'paid'`,
      [email.trim()],
    );
    return rows.map(r => Number(r.track_id));
  }

  // ─── Accounts ───────────────────────────────────────────────────

  async findUserById(id: number): Promise<User | null> {
    const { rows } = await this.db.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const { rows } = await this.db.query(`SELECT ${USER_COLUMNS} FROM users WHERE lower(email) = lower($1)`, [email.trim()]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findUserByStripeCustomer(customerId: string): Promise<User | null> {
    const { rows } = await this.db.query(`SELECT ${USER_COLUMNS} FROM users WHERE stripe_customer_id = $1`, [customerId]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async upsertUser(email: string, stripeCustomerId?: string | null): Promise<User> {
    const { rows } = await this.db.query(
      `INSERT INTO users (email, stripe_customer_id) VALUES (lower($1), $2)
       ON CONFLICT ((lower(email))) DO UPDATE
         SET stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, users.stripe_customer_id)
       RETURNING ${USER_COLUMNS}`,
      [email.trim(), stripeCustomerId ?? null],
    );
    return toUser(rows[0]);
  }

  async touchLogin(userId: number): Promise<void> {
    await this.db.query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [userId]);
  }

  async upsertSubscription(sub: Subscription): Promise<void> {
    await this.db.query(
      `INSERT INTO subscriptions (stripe_subscription_id, user_id, status, price_id, current_period_end, cancel_at_period_end, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (stripe_subscription_id) DO UPDATE SET
         user_id = EXCLUDED.user_id, status = EXCLUDED.status, price_id = EXCLUDED.price_id,
         current_period_end = EXCLUDED.current_period_end,
         cancel_at_period_end = EXCLUDED.cancel_at_period_end, updated_at = now()`,
      [sub.stripeSubscriptionId, sub.userId, sub.status, sub.priceId, sub.currentPeriodEnd, sub.cancelAtPeriodEnd],
    );
  }

  async listSubscriptions(userId: number): Promise<Subscription[]> {
    const { rows } = await this.db.query(
      `SELECT stripe_subscription_id, user_id, status, price_id, current_period_end, cancel_at_period_end
       FROM subscriptions WHERE user_id = $1 ORDER BY current_period_end DESC NULLS LAST`,
      [userId],
    );
    return rows.map((r: any) => ({
      stripeSubscriptionId: r.stripe_subscription_id,
      userId: Number(r.user_id),
      status: r.status,
      priceId: r.price_id ?? null,
      currentPeriodEnd: r.current_period_end ? iso(r.current_period_end) : null,
      cancelAtPeriodEnd: Boolean(r.cancel_at_period_end),
    }));
  }

  // ─── Magic-link tokens ──────────────────────────────────────────

  async createLoginToken(tokenHash: string, email: string, expiresAt: Date): Promise<void> {
    await this.db.query(`INSERT INTO login_tokens (token_hash, email, expires_at) VALUES ($1, lower($2), $3)`, [
      tokenHash,
      email.trim(),
      expiresAt.toISOString(),
    ]);
  }

  async consumeLoginToken(tokenHash: string): Promise<string | null> {
    // One statement, so two clicks racing on the same link can't both succeed.
    const { rows } = await this.db.query<{ email: string }>(
      `UPDATE login_tokens SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       RETURNING email`,
      [tokenHash],
    );
    return rows[0]?.email ?? null;
  }

  async countLoginTokensSince(email: string, since: Date): Promise<number> {
    const { rows } = await this.db.query<{ n: string | number }>(
      `SELECT count(*) AS n FROM login_tokens WHERE lower(email) = lower($1) AND created_at > $2`,
      [email.trim(), since.toISOString()],
    );
    return Number(rows[0]?.n ?? 0);
  }

  // ─── Downloads ──────────────────────────────────────────────────

  async logDownload(d: { userId: number | null; email: string | null; trackId: number; format: MasterFormat; via: DownloadVia }) {
    await this.db.query(`INSERT INTO downloads (user_id, email, track_id, format, via) VALUES ($1, $2, $3, $4, $5)`, [
      d.userId,
      d.email,
      d.trackId,
      d.format,
      d.via,
    ]);
  }

  async countDownloadsSince(userId: number, since: Date): Promise<number> {
    const { rows } = await this.db.query<{ n: string | number }>(
      `SELECT count(*) AS n FROM downloads WHERE user_id = $1 AND created_at > $2`,
      [userId, since.toISOString()],
    );
    return Number(rows[0]?.n ?? 0);
  }
}
