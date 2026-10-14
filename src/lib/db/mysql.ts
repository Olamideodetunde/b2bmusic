import type { DownloadVia, MasterFormat, Order, PublishEvent, Subscription, Track, TrackInput, User } from './types';
import { SlugConflictError, type TrackRepository } from './repository';

/**
 * MySQL / MariaDB storage (schema: db/migrations-mysql). Same behaviour as
 * PostgresRepository; differences are only in SQL dialect:
 *   - no RETURNING: writes are followed by a read of the row (by insertId or key);
 *   - ON CONFLICT → INSERT IGNORE / ON DUPLICATE KEY UPDATE, using affectedRows;
 *   - TEXT[] / JSONB → JSON columns (MariaDB hands JSON back as a string, MySQL parsed);
 *   - timestamps are DATETIME(3) in UTC — the pool sets time_zone = '+00:00' and
 *     mysql2's `timezone: 'Z'`, and Date objects are passed as parameters.
 */
export interface MysqlQueryable {
  query(sql: string, params?: unknown[]): Promise<[unknown, unknown]>;
}

type Row = Record<string, any>;
type Result = { insertId: number; affectedRows: number };

const TRACK_COLUMNS = `
  id, slug, title, target_keyword, genre, bpm, musical_key, duration_seconds, description,
  moods, use_cases, preview_audio_url, cover_image_url,
  standard_price_cents, commercial_price_cents, broadcast_price_cents,
  full_audio_url, master_wav_key, master_aiff_key, vocal_type, stripe_product_id, alt_mixes, stems, sync_meta,
  is_published, published_at, updated_at`;

const USER_COLUMNS = `id, email, stripe_customer_id, created_at`;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : new Date(String(v).replace(' ', 'T') + 'Z').toISOString());
const json = <T>(v: unknown, fallback: T): T => {
  if (v === null || v === undefined) return fallback;
  if (Buffer.isBuffer(v)) v = v.toString('utf8');
  return (typeof v === 'string' ? JSON.parse(v) : v) as T;
};

function toUser(r: Row): User {
  return { id: Number(r.id), email: r.email, stripeCustomerId: r.stripe_customer_id ?? null, createdAt: iso(r.created_at) };
}

function toTrack(r: Row): Track {
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
    moods: json(r.moods, []),
    useCases: json(r.use_cases, []),
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

export class MysqlRepository implements TrackRepository {
  readonly kind = 'mysql' as const;

  constructor(private readonly db: MysqlQueryable) {}

  private async rows(sql: string, params: unknown[] = []): Promise<Row[]> {
    const [rows] = await this.db.query(sql, params);
    return rows as Row[];
  }

  private async run(sql: string, params: unknown[] = []): Promise<Result> {
    const [result] = await this.db.query(sql, params);
    return result as Result;
  }

  private async trackWhere(where: string, params: unknown[]): Promise<Track | null> {
    const [row] = await this.rows(`SELECT ${TRACK_COLUMNS} FROM tracks WHERE ${where} ORDER BY id LIMIT 1`, params);
    return row ? toTrack(row) : null;
  }

  async listPublished(): Promise<Track[]> {
    const rows = await this.rows(`SELECT ${TRACK_COLUMNS} FROM tracks WHERE is_published = 1 ORDER BY published_at DESC, id DESC`);
    return rows.map(toTrack);
  }

  findById(id: number) {
    return this.trackWhere('id = ?', [id]);
  }

  async findByIds(ids: number[]): Promise<Track[]> {
    if (ids.length === 0) return [];
    const rows = await this.rows(`SELECT ${TRACK_COLUMNS} FROM tracks WHERE is_published = 1 AND id IN (?)`, [ids]);
    return rows.map(toTrack);
  }

  findBySlug(slug: string) {
    return this.trackWhere('slug = ?', [slug]);
  }

  findByKeywordAndTitle(targetKeyword: string, title: string) {
    return this.trackWhere('lower(target_keyword) = lower(?) AND lower(title) = lower(?)', [targetKeyword.trim(), title.trim()]);
  }

  async findByTargetKeyword(targetKeyword: string): Promise<Track[]> {
    const rows = await this.rows(`SELECT ${TRACK_COLUMNS} FROM tracks WHERE lower(target_keyword) = lower(?) ORDER BY id`, [
      targetKeyword.trim(),
    ]);
    return rows.map(toTrack);
  }

  findByDescription(description: string) {
    // MD5 on both sides = exact, byte-for-byte match (a plain "=" would be case-insensitive under the _ci collation).
    return this.trackWhere('MD5(description) = MD5(?)', [description.trim()]);
  }

  async genreCounts(): Promise<Record<string, number>> {
    const rows = await this.rows(`SELECT genre, COUNT(*) AS n FROM tracks WHERE is_published = 1 GROUP BY genre`);
    return Object.fromEntries(rows.map(r => [r.genre, Number(r.n)]));
  }

  async slugsLike(base: string): Promise<string[]> {
    // LIKE narrows it down; the exact "<base>-<digits>" shape is checked here (regex dialects differ by server).
    const like = `${base.replace(/[\\%_]/g, m => `\\${m}`)}-%`;
    const rows = await this.rows(`SELECT slug FROM tracks WHERE slug = ? OR slug LIKE ?`, [base, like]);
    const suffixed = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[0-9]+$`);
    return rows.map(r => r.slug as string).filter(s => s === base || suffixed.test(s));
  }

  async insert(input: TrackInput, slug: string): Promise<Track> {
    try {
      const { insertId } = await this.run(
        `INSERT INTO tracks (
           title, target_keyword, genre, bpm, musical_key, duration_seconds, description,
           moods, use_cases, preview_audio_url, cover_image_url,
           standard_price_cents, commercial_price_cents, broadcast_price_cents,
           full_audio_url, vocal_type, alt_mixes, stems, sync_meta, master_wav_key, master_aiff_key, slug
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.title, input.targetKeyword, input.genre, input.bpm, input.musicalKey, input.durationSeconds, input.description,
          JSON.stringify(input.moods), JSON.stringify(input.useCases), input.previewAudioUrl, input.coverImageUrl ?? null,
          input.standardPriceCents, input.commercialPriceCents, input.broadcastPriceCents,
          input.fullAudioUrl ?? null, input.vocalType ?? null,
          JSON.stringify(input.altMixes ?? []), JSON.stringify(input.stems ?? []),
          input.syncMeta ? JSON.stringify(input.syncMeta) : null,
          input.masterWavKey ?? null, input.masterAiffKey ?? null, slug,
        ],
      );
      return (await this.findById(insertId))!;
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY' && String(err?.message ?? '').includes('slug')) throw new SlugConflictError(slug);
      throw err;
    }
  }

  async update(id: number, input: TrackInput): Promise<Track> {
    // Slug is deliberately NOT updated — the live URL must never change (sheet rule).
    // Enrichment and masters omitted from the sheet keep what's stored (COALESCE).
    const { affectedRows } = await this.run(
      `UPDATE tracks SET
         title = ?, target_keyword = ?, genre = ?, bpm = ?, musical_key = ?,
         duration_seconds = ?, description = ?, moods = ?, use_cases = ?,
         preview_audio_url = ?, cover_image_url = ?,
         standard_price_cents = ?, commercial_price_cents = ?, broadcast_price_cents = ?,
         full_audio_url = COALESCE(?, full_audio_url),
         vocal_type = COALESCE(?, vocal_type),
         alt_mixes = COALESCE(?, alt_mixes),
         stems = COALESCE(?, stems),
         sync_meta = COALESCE(?, sync_meta),
         master_wav_key = COALESCE(?, master_wav_key),
         master_aiff_key = COALESCE(?, master_aiff_key),
         is_published = 1,
         updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [
        input.title, input.targetKeyword, input.genre, input.bpm, input.musicalKey,
        input.durationSeconds, input.description, JSON.stringify(input.moods), JSON.stringify(input.useCases),
        input.previewAudioUrl, input.coverImageUrl ?? null,
        input.standardPriceCents, input.commercialPriceCents, input.broadcastPriceCents,
        input.fullAudioUrl ?? null, input.vocalType ?? null,
        input.altMixes ? JSON.stringify(input.altMixes) : null,
        input.stems ? JSON.stringify(input.stems) : null,
        input.syncMeta ? JSON.stringify(input.syncMeta) : null,
        input.masterWavKey ?? null, input.masterAiffKey ?? null,
        id,
      ],
    );
    const track = affectedRows ? await this.findById(id) : null;
    if (!track) throw new Error(`Track ${id} not found`);
    return track;
  }

  async logEvent(e: { trackId: number | null; action: PublishEvent['action']; ok: boolean; message: string; payload?: unknown }) {
    await this.run(`INSERT INTO publish_events (track_id, action, ok, message, payload) VALUES (?, ?, ?, ?, ?)`, [
      e.trackId, e.action, e.ok, e.message, e.payload === undefined ? null : JSON.stringify(e.payload),
    ]);
  }

  async recentEvents(limit: number): Promise<PublishEvent[]> {
    const rows = await this.rows(`SELECT id, track_id, action, ok, message, created_at FROM publish_events ORDER BY id DESC LIMIT ?`, [
      limit,
    ]);
    return rows.map(r => ({
      id: Number(r.id),
      trackId: r.track_id === null ? null : Number(r.track_id),
      action: r.action,
      ok: Boolean(r.ok),
      message: r.message,
      createdAt: iso(r.created_at),
    }));
  }

  async createOrder(o: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<boolean> {
    const { affectedRows } = await this.run(
      `INSERT IGNORE INTO orders (stripe_session_id, track_id, tier, amount_cents, currency, customer_email) VALUES (?, ?, ?, ?, ?, ?)`,
      [o.stripeSessionId, o.trackId, o.tier, o.amountCents, o.currency, o.customerEmail],
    );
    return affectedRows > 0;
  }

  async markOrderRefunded(stripeSessionId: string): Promise<boolean> {
    const { affectedRows } = await this.run(
      `UPDATE orders SET status = 'refunded' WHERE stripe_session_id = ? AND status <> 'refunded'`,
      [stripeSessionId],
    );
    return affectedRows > 0;
  }

  async purchasedTrackIds(email: string): Promise<number[]> {
    const rows = await this.rows(`SELECT DISTINCT track_id FROM orders WHERE lower(customer_email) = lower(?) AND status = 'paid'`, [
      email.trim(),
    ]);
    return rows.map(r => Number(r.track_id));
  }

  // ─── Accounts ───────────────────────────────────────────────────

  private async userWhere(where: string, params: unknown[]): Promise<User | null> {
    const [row] = await this.rows(`SELECT ${USER_COLUMNS} FROM users WHERE ${where} LIMIT 1`, params);
    return row ? toUser(row) : null;
  }

  findUserById(id: number) {
    return this.userWhere('id = ?', [id]);
  }

  findUserByEmail(email: string) {
    return this.userWhere('email = lower(?)', [email.trim()]);
  }

  findUserByStripeCustomer(customerId: string) {
    return this.userWhere('stripe_customer_id = ?', [customerId]);
  }

  async upsertUser(email: string, stripeCustomerId?: string | null): Promise<User> {
    const normalized = email.trim().toLowerCase();
    // An existing link to a Stripe customer is never overwritten.
    await this.run(
      `INSERT INTO users (email, stripe_customer_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE stripe_customer_id = COALESCE(stripe_customer_id, VALUES(stripe_customer_id))`,
      [normalized, stripeCustomerId ?? null],
    );
    const user = await this.findUserByEmail(normalized);
    if (!user) throw new Error(`Stripe customer ${stripeCustomerId} is already linked to another account`);
    return user;
  }

  async touchLogin(userId: number): Promise<void> {
    await this.run(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?`, [userId]);
  }

  async upsertSubscription(sub: Subscription): Promise<void> {
    await this.run(
      `INSERT INTO subscriptions (stripe_subscription_id, user_id, status, price_id, current_period_end, cancel_at_period_end, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id), status = VALUES(status), price_id = VALUES(price_id),
         current_period_end = VALUES(current_period_end),
         cancel_at_period_end = VALUES(cancel_at_period_end), updated_at = CURRENT_TIMESTAMP(3)`,
      [
        sub.stripeSubscriptionId, sub.userId, sub.status, sub.priceId,
        sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null, sub.cancelAtPeriodEnd,
      ],
    );
  }

  async listSubscriptions(userId: number): Promise<Subscription[]> {
    const rows = await this.rows(
      `SELECT stripe_subscription_id, user_id, status, price_id, current_period_end, cancel_at_period_end
       FROM subscriptions WHERE user_id = ? ORDER BY current_period_end IS NULL, current_period_end DESC`,
      [userId],
    );
    return rows.map(r => ({
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
    await this.run(`INSERT INTO login_tokens (token_hash, email, expires_at) VALUES (?, lower(?), ?)`, [tokenHash, email.trim(), expiresAt]);
  }

  async consumeLoginToken(tokenHash: string): Promise<string | null> {
    // The UPDATE is atomic: of two clicks racing on the same link, only one sees affectedRows = 1.
    const { affectedRows } = await this.run(
      `UPDATE login_tokens SET used_at = CURRENT_TIMESTAMP(3)
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP(3)`,
      [tokenHash],
    );
    if (!affectedRows) return null;
    const [row] = await this.rows(`SELECT email FROM login_tokens WHERE token_hash = ?`, [tokenHash]);
    return row?.email ?? null;
  }

  async countLoginTokensSince(email: string, since: Date): Promise<number> {
    const [row] = await this.rows(`SELECT COUNT(*) AS n FROM login_tokens WHERE email = lower(?) AND created_at > ?`, [email.trim(), since]);
    return Number(row?.n ?? 0);
  }

  // ─── Downloads ──────────────────────────────────────────────────

  async logDownload(d: { userId: number | null; email: string | null; trackId: number; format: MasterFormat; via: DownloadVia }) {
    await this.run(`INSERT INTO downloads (user_id, email, track_id, format, via) VALUES (?, ?, ?, ?, ?)`, [
      d.userId, d.email, d.trackId, d.format, d.via,
    ]);
  }

  async countDownloadsSince(userId: number, since: Date): Promise<number> {
    const [row] = await this.rows(`SELECT COUNT(*) AS n FROM downloads WHERE user_id = ? AND created_at > ?`, [userId, since]);
    return Number(row?.n ?? 0);
  }
}
