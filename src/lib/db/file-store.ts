import { promises as fs } from 'fs';
import path from 'path';
import type { DownloadVia, MasterFormat, Order, PublishEvent, Subscription, Track, TrackInput, User } from './types';
import { SlugConflictError, StorageNotConfiguredError, type TrackRepository } from './repository';
import { initialTracks } from './mock-data';

/**
 * Zero-config local store used when DATABASE_URL is not set, so the whole
 * Sheet → API → page pipeline can be exercised on a laptop without a Neon account.
 * Data lives in .data/local-db.json (seeded from the demo catalog on first use).
 *
 * Not for production: in a production runtime, writes throw StorageNotConfiguredError.
 */

interface StoreShape {
  tracks: Track[];
  events: (PublishEvent & { payload?: unknown })[];
  orders: Order[];
  users?: (User & { lastLoginAt?: string })[];
  subscriptions?: Subscription[];
  loginTokens?: { tokenHash: string; email: string; expiresAt: string; usedAt: string | null; createdAt: string }[];
  downloads?: { userId: number | null; email: string | null; trackId: number; format: MasterFormat; via: DownloadVia; createdAt: string }[];
}

// Override with LOCAL_DB_PATH (the test suite points this at a temp file).
const storePath = () => process.env.LOCAL_DB_PATH || path.join(process.cwd(), '.data', 'local-db.json');

function assertWritable() {
  // `next build` runs with NODE_ENV=production too, but never writes; only runtime writes are blocked.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_FILE_STORE !== 'true') {
    throw new StorageNotConfiguredError();
  }
}

async function load(): Promise<StoreShape> {
  try {
    return JSON.parse(await fs.readFile(storePath(), 'utf8')) as StoreShape;
  } catch (err: any) {
    if (err?.code !== 'ENOENT') throw err;
    return { tracks: structuredClone(initialTracks), events: [], orders: [] };
  }
}

async function save(store: StoreShape) {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2));
  await fs.rename(tmp, file);
}

const now = () => new Date().toISOString();

export class FileRepository implements TrackRepository {
  readonly kind = 'file' as const;

  async listPublished() {
    const { tracks } = await load();
    return tracks
      .filter(t => t.isPublished)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.id - a.id);
  }

  async findById(id: number) {
    return (await load()).tracks.find(t => t.id === id) ?? null;
  }

  async findByIds(ids: number[]) {
    const set = new Set(ids);
    return (await load()).tracks.filter(t => t.isPublished && set.has(t.id));
  }

  async findBySlug(slug: string) {
    return (await load()).tracks.find(t => t.slug === slug) ?? null;
  }

  async findByKeywordAndTitle(targetKeyword: string, title: string) {
    const k = targetKeyword.trim().toLowerCase();
    const ti = title.trim().toLowerCase();
    return (await load()).tracks.find(t => t.targetKeyword.toLowerCase() === k && t.title.toLowerCase() === ti) ?? null;
  }

  async findByTargetKeyword(targetKeyword: string) {
    const k = targetKeyword.trim().toLowerCase();
    return (await load()).tracks.filter(t => t.targetKeyword.toLowerCase() === k);
  }

  async findByDescription(description: string) {
    const d = description.trim();
    return (await load()).tracks.find(t => t.description.trim() === d) ?? null;
  }

  async genreCounts() {
    const counts: Record<string, number> = {};
    for (const t of (await load()).tracks) if (t.isPublished) counts[t.genre] = (counts[t.genre] ?? 0) + 1;
    return counts;
  }

  async slugsLike(base: string) {
    const re = new RegExp(`^${base}(-\\d+)?$`);
    return (await load()).tracks.map(t => t.slug).filter(s => re.test(s));
  }

  async insert(input: TrackInput, slug: string): Promise<Track> {
    assertWritable();
    const store = await load();
    if (store.tracks.some(t => t.slug === slug)) throw new SlugConflictError(slug);
    const ts = now();
    const track: Track = {
      ...input,
      id: store.tracks.reduce((max, t) => Math.max(max, t.id), 0) + 1,
      slug,
      altMixes: input.altMixes ?? [],
      stems: input.stems ?? [],
      isPublished: true,
      publishedAt: ts,
      updatedAt: ts,
    };
    store.tracks.push(track);
    await save(store);
    return track;
  }

  async update(id: number, input: TrackInput): Promise<Track> {
    assertWritable();
    const store = await load();
    const i = store.tracks.findIndex(t => t.id === id);
    if (i < 0) throw new Error(`Track ${id} not found`);
    const prev = store.tracks[i];
    const next: Track = {
      ...prev,
      ...input,
      // Keep stored enrichment when the row omits it (the sheet never carries it).
      altMixes: input.altMixes ?? prev.altMixes,
      stems: input.stems ?? prev.stems,
      syncMeta: input.syncMeta ?? prev.syncMeta,
      fullAudioUrl: input.fullAudioUrl ?? prev.fullAudioUrl,
      masterWavKey: input.masterWavKey ?? prev.masterWavKey,
      masterAiffKey: input.masterAiffKey ?? prev.masterAiffKey,
      vocalType: input.vocalType ?? prev.vocalType,
      id: prev.id,
      slug: prev.slug, // the live URL never changes
      isPublished: true,
      updatedAt: now(),
    };
    store.tracks[i] = next;
    await save(store);
    return next;
  }

  async logEvent(e: { trackId: number | null; action: PublishEvent['action']; ok: boolean; message: string; payload?: unknown }) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_FILE_STORE !== 'true') return;
    const store = await load();
    store.events.push({ id: store.events.length + 1, createdAt: now(), ...e });
    store.events = store.events.slice(-500);
    await save(store);
  }

  async recentEvents(limit: number): Promise<PublishEvent[]> {
    return (await load()).events.slice(-limit).reverse().map(({ payload: _p, ...e }) => e);
  }

  async createOrder(o: Omit<Order, 'id' | 'createdAt' | 'status'>) {
    assertWritable();
    const store = await load();
    if (store.orders.some(x => x.stripeSessionId === o.stripeSessionId)) return false;
    store.orders.push({ ...o, id: store.orders.length + 1, status: 'paid', createdAt: now() });
    await save(store);
    return true;
  }

  async markOrderRefunded(stripeSessionId: string) {
    assertWritable();
    const store = await load();
    const order = store.orders.find(x => x.stripeSessionId === stripeSessionId);
    if (!order || order.status === 'refunded') return false;
    order.status = 'refunded';
    await save(store);
    return true;
  }

  async purchasedTrackIds(email: string) {
    const e = email.trim().toLowerCase();
    const ids = (await load()).orders.filter(o => o.status === 'paid' && o.customerEmail?.toLowerCase() === e).map(o => o.trackId);
    return Array.from(new Set(ids));
  }

  // ─── Accounts ───────────────────────────────────────────────────

  async findUserById(id: number) {
    return strip((await load()).users?.find(u => u.id === id));
  }

  async findUserByEmail(email: string) {
    const e = email.trim().toLowerCase();
    return strip((await load()).users?.find(u => u.email === e));
  }

  async findUserByStripeCustomer(customerId: string) {
    return strip((await load()).users?.find(u => u.stripeCustomerId === customerId));
  }

  async upsertUser(email: string, stripeCustomerId?: string | null) {
    assertWritable();
    const store = await load();
    const users = (store.users ??= []);
    const e = email.trim().toLowerCase();
    let user = users.find(u => u.email === e);
    if (!user) {
      user = { id: users.reduce((m, u) => Math.max(m, u.id), 0) + 1, email: e, stripeCustomerId: stripeCustomerId ?? null, createdAt: now() };
      users.push(user);
    } else if (stripeCustomerId) {
      user.stripeCustomerId = stripeCustomerId;
    }
    await save(store);
    return strip(user)!;
  }

  async touchLogin(userId: number) {
    assertWritable();
    const store = await load();
    const user = store.users?.find(u => u.id === userId);
    if (user) {
      user.lastLoginAt = now();
      await save(store);
    }
  }

  async upsertSubscription(sub: Subscription) {
    assertWritable();
    const store = await load();
    const subs = (store.subscriptions ??= []);
    const i = subs.findIndex(x => x.stripeSubscriptionId === sub.stripeSubscriptionId);
    if (i >= 0) subs[i] = sub;
    else subs.push(sub);
    await save(store);
  }

  async listSubscriptions(userId: number) {
    return ((await load()).subscriptions ?? [])
      .filter(s => s.userId === userId)
      .sort((a, b) => (b.currentPeriodEnd ?? '').localeCompare(a.currentPeriodEnd ?? ''));
  }

  // ─── Magic-link tokens ──────────────────────────────────────────

  async createLoginToken(tokenHash: string, email: string, expiresAt: Date) {
    assertWritable();
    const store = await load();
    (store.loginTokens ??= []).push({ tokenHash, email: email.trim().toLowerCase(), expiresAt: expiresAt.toISOString(), usedAt: null, createdAt: now() });
    // Keep the local file small: drop tokens older than a day.
    const cutoff = Date.now() - 24 * 3600_000;
    store.loginTokens = store.loginTokens.filter(t => Date.parse(t.createdAt) > cutoff);
    await save(store);
  }

  async consumeLoginToken(tokenHash: string) {
    assertWritable();
    const store = await load();
    const t = store.loginTokens?.find(x => x.tokenHash === tokenHash);
    if (!t || t.usedAt || Date.parse(t.expiresAt) <= Date.now()) return null;
    t.usedAt = now();
    await save(store);
    return t.email;
  }

  async countLoginTokensSince(email: string, since: Date) {
    const e = email.trim().toLowerCase();
    return ((await load()).loginTokens ?? []).filter(t => t.email === e && Date.parse(t.createdAt) > since.getTime()).length;
  }

  // ─── Downloads ──────────────────────────────────────────────────

  async logDownload(d: { userId: number | null; email: string | null; trackId: number; format: MasterFormat; via: DownloadVia }) {
    assertWritable();
    const store = await load();
    (store.downloads ??= []).push({ ...d, createdAt: now() });
    store.downloads = store.downloads.slice(-2000);
    await save(store);
  }

  async countDownloadsSince(userId: number, since: Date) {
    return ((await load()).downloads ?? []).filter(d => d.userId === userId && Date.parse(d.createdAt) > since.getTime()).length;
  }
}

function strip(u: (User & { lastLoginAt?: string }) | undefined): User | null {
  if (!u) return null;
  const { lastLoginAt: _l, ...user } = u;
  return user;
}
