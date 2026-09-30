import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs, existsSync, readdirSync, statSync } from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { pgliteRepo, fileRepo, sampleRows } from './helpers';
import type { TrackRepository } from '../src/lib/db/repository';
import { publishTrack } from '../src/lib/ingest/service';
import { parseTrackRow } from '../src/lib/ingest/parse';
import { isSubscriptionActive, downloadAccess, loadViewer } from '../src/lib/auth/access';
import { signToken, verifyToken, createSessionValue, readSessionValue, safeNextPath, isValidEmail, newLoginToken, hashLoginToken } from '../src/lib/auth/session';
import { toPublicTrack, setRepositoryForTesting, getAllTracks } from '../src/lib/db';
import { isValidObjectKey } from '../src/lib/storage/keys';
import { formatPlan } from '../src/lib/plan';
import {
  DEFAULT_WATERMARK, defaultTagArgs, ffmpeg, ffmpegPath, masterArgs, previewArgs, probe, tagBedArgs, validateOptions,
} from '../src/lib/audio/watermark';
import { okFetch } from './helpers';

const HOUR = 3600_000;

for (const [label, make] of [['postgres (PGlite)', pgliteRepo], ['file store', fileRepo]] as const) {
  describe(`accounts — ${label}`, () => {
    let repo: TrackRepository;
    let close: () => Promise<void>;
    let trackId: number;

    before(async () => {
      ({ repo, close } = await make());
      const [row] = await sampleRows();
      const r = await publishTrack(repo, { ...row, 'Master WAV': 'masters/apex.wav' }, { fetchImpl: okFetch });
      assert.ok(r.ok, JSON.stringify(r));
      trackId = r.trackId;
    });
    after(() => close());

    test('masters are stored as private object keys', async () => {
      const t = await repo.findById(trackId);
      assert.equal(t?.masterWavKey, 'masters/apex.wav');
    });

    test('users are matched case-insensitively and linked to their Stripe customer', async () => {
      const a = await repo.upsertUser('Buyer@Studio.com');
      const b = await repo.upsertUser('buyer@studio.com', 'cus_123');
      assert.equal(a.id, b.id);
      assert.equal(b.stripeCustomerId, 'cus_123');
      assert.equal((await repo.findUserByStripeCustomer('cus_123'))?.id, a.id);
      assert.equal((await repo.upsertUser('BUYER@studio.com')).stripeCustomerId, 'cus_123', 'a later sign-in keeps the link');
    });

    test('magic-link tokens are single use and expire', async () => {
      const live = newLoginToken();
      await repo.createLoginToken(live.hash, 'Link@Example.com', new Date(Date.now() + HOUR));
      assert.equal(await repo.consumeLoginToken(live.hash), 'link@example.com');
      assert.equal(await repo.consumeLoginToken(live.hash), null, 'second click fails');

      const stale = newLoginToken();
      await repo.createLoginToken(stale.hash, 'link@example.com', new Date(Date.now() - 1000));
      assert.equal(await repo.consumeLoginToken(stale.hash), null, 'expired');
      assert.equal(await repo.countLoginTokensSince('LINK@example.com', new Date(Date.now() - HOUR)), 2);
    });

    test('a subscriber can download everything; a buyer only their track; refunds revoke', async () => {
      const sub = await repo.upsertUser('subscriber@example.com', 'cus_sub');
      await repo.upsertSubscription({
        stripeSubscriptionId: 'sub_1', userId: sub.id, status: 'active', priceId: 'price_1',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * HOUR).toISOString(), cancelAtPeriodEnd: false,
      });
      const subViewer = await loadViewer(repo, { uid: sub.id, email: sub.email });
      assert.equal(subViewer?.isSubscribed, true);
      assert.equal(downloadAccess(subViewer, trackId), 'subscription');
      assert.equal(downloadAccess(subViewer, 999_999), 'subscription');

      // Stripe says it was cancelled → access ends.
      await repo.upsertSubscription({ ...(await repo.listSubscriptions(sub.id))[0], status: 'canceled' });
      assert.equal((await loadViewer(repo, { uid: sub.id, email: sub.email }))?.isSubscribed, false);

      const buyer = await repo.upsertUser('single@example.com');
      await repo.createOrder({ stripeSessionId: 'cs_single', trackId, tier: 'standard', amountCents: 1000, currency: 'usd', customerEmail: 'Single@Example.com' });
      const buyerViewer = await loadViewer(repo, { uid: buyer.id, email: buyer.email });
      assert.equal(downloadAccess(buyerViewer, trackId), 'purchase');
      assert.equal(downloadAccess(buyerViewer, trackId + 1), null);

      await repo.markOrderRefunded('cs_single');
      assert.deepEqual(await repo.purchasedTrackIds('single@example.com'), []);
    });

    test('a session for another email is not honoured', async () => {
      const u = await repo.upsertUser('owner@example.com');
      assert.equal(await loadViewer(repo, { uid: u.id, email: 'attacker@example.com' }), null);
    });

    test('downloads are logged for the fair-use limit', async () => {
      const u = await repo.upsertUser('dl@example.com');
      await repo.logDownload({ userId: u.id, email: u.email, trackId, format: 'wav', via: 'subscription' });
      await repo.logDownload({ userId: u.id, email: u.email, trackId, format: 'aiff', via: 'subscription' });
      assert.equal(await repo.countDownloadsSince(u.id, new Date(Date.now() - HOUR)), 2);
    });

    test('pages never receive master locations', async () => {
      setRepositoryForTesting(repo);
      try {
        const tracks = await getAllTracks();
        assert.ok(tracks.length > 0);
        for (const t of tracks) {
          assert.equal(t.masterWavKey, undefined);
          assert.equal(t.masterAiffKey, undefined);
          assert.equal(t.fullAudioUrl, undefined);
        }
      } finally {
        setRepositoryForTesting(undefined);
      }
    });
  });
}

test('subscription status: only active/trialing within the paid period unlock', () => {
  const base = { stripeSubscriptionId: 's', userId: 1, priceId: null, cancelAtPeriodEnd: false };
  const future = new Date(Date.now() + HOUR).toISOString();
  assert.equal(isSubscriptionActive({ ...base, status: 'active', currentPeriodEnd: future }), true);
  assert.equal(isSubscriptionActive({ ...base, status: 'trialing', currentPeriodEnd: future }), true);
  assert.equal(isSubscriptionActive({ ...base, status: 'past_due', currentPeriodEnd: future }), false);
  assert.equal(isSubscriptionActive({ ...base, status: 'canceled', currentPeriodEnd: future }), false);
  assert.equal(isSubscriptionActive({ ...base, status: 'active', currentPeriodEnd: new Date(Date.now() - HOUR).toISOString() }), false, 'missed cancel webhook');
  assert.equal(downloadAccess(null, 1), null, 'signed-out visitors get the unlock modal');
});

test('signed cookies and receipt links reject tampering and expiry', () => {
  const value = createSessionValue({ id: 7, email: 'a@b.co' });
  assert.deepEqual({ ...readSessionValue(value), exp: 0 }, { uid: 7, email: 'a@b.co', exp: 0 });
  const [body, sig] = value.split('.');
  const forged = Buffer.from(JSON.stringify({ uid: 1, email: 'admin@b.co', exp: 9e9 })).toString('base64url');
  assert.equal(readSessionValue(`${forged}.${sig}`), null, 'swapped payload');
  assert.equal(readSessionValue(`${body}.${sig.slice(0, -2)}xx`), null, 'bad signature');
  assert.equal(verifyToken(signToken({ exp: Math.floor(Date.now() / 1000) - 1 })), null, 'expired');
  assert.equal(verifyToken(signToken({ exp: 9e9 }, 'a'.repeat(32)), 'b'.repeat(32)), null, 'other secret');
  assert.equal(hashLoginToken('abc'), hashLoginToken('abc'));
  assert.notEqual(newLoginToken().token, newLoginToken().token);
});

test('post-login redirects stay on this site', () => {
  assert.equal(safeNextPath('/tracks/x?y=1'), '/tracks/x?y=1');
  assert.equal(safeNextPath('https://evil.com'), '/');
  assert.equal(safeNextPath('//evil.com'), '/');
  assert.equal(safeNextPath('/\\evil.com'), '/');
  assert.equal(isValidEmail('editor@studio.co'), true);
  assert.equal(isValidEmail('not-an-email'), false);
});

test('sheet master columns take private-bucket keys, never URLs', async () => {
  const [row] = await sampleRows();
  const ok = parseTrackRow({ ...row, 'Master WAV': 'masters/apex.wav', 'Master AIFF': 'masters/apex.aiff' });
  assert.equal(ok.input?.masterWavKey, 'masters/apex.wav');
  assert.equal(ok.input?.masterAiffKey, 'masters/apex.aiff');
  const url = parseTrackRow({ ...row, 'Master WAV': 'https://bucket.s3.amazonaws.com/apex.wav' });
  assert.ok(url.errors.some(e => e.field === 'masterWavKey'), 'a URL would make the master public');
  const ext = parseTrackRow({ ...row, 'Master WAV': 'masters/apex.mp3' });
  assert.ok(ext.errors.some(e => e.field === 'masterWavKey'));
  assert.equal(isValidObjectKey('masters/../secrets.wav'), false);
  assert.equal(toPublicTrack({ ...(ok.input as any), masterWavKey: 'k', fullAudioUrl: 'u' }).masterWavKey, undefined);
});

test('plan label', () => {
  assert.equal(formatPlan({ priceId: 'p', amountCents: 2900, currency: 'usd', interval: 'month', intervalCount: 1 }), '$29/mo');
  assert.equal(formatPlan({ priceId: 'p', amountCents: 29000, currency: 'usd', interval: 'year', intervalCount: 1 }), '$290/yr');
});

test('watermark options are validated and the FFmpeg graph is built as specified', () => {
  assert.throws(() => validateOptions({ ...DEFAULT_WATERMARK, everySeconds: 3 }), /--every/);
  assert.throws(() => validateOptions({ ...DEFAULT_WATERMARK, bitrateKbps: 320 }), /--bitrate/);
  const args = previewArgs('m.wav', 'bed.wav', 'out.mp3', DEFAULT_WATERMARK);
  assert.equal(args[args.indexOf('-b:a') + 1], '128k');
  assert.ok(args.indexOf('-stream_loop') < args.indexOf('bed.wav'), 'the tag bed is looped');
  assert.ok(args[args.indexOf('-filter_complex') + 1].includes('adelay=delays=3000'));
  assert.equal(args[args.indexOf('-map_metadata') + 1], '-1', 'master metadata is not copied into previews');
});

// Real FFmpeg run: a 30 s test tone in, a 128 kbps preview out, with the chime at 3 s, 15 s and 27 s.
const ffmpegWorks = (() => {
  try {
    execFileSync(ffmpegPath(), ['-hide_banner', '-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

test('FFmpeg pipeline: 128 kbps preview with a watermark every 12 s', { skip: !ffmpegWorks && 'FFmpeg binary unavailable' }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gb2b-wm-'));
  try {
    const master = path.join(dir, 'master.wav');
    await ffmpeg(['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:sample_rate=48000:duration=30', '-ac', '2', '-c:a', 'pcm_s24le', master]);
    await ffmpeg(defaultTagArgs(path.join(dir, 'tag.wav')));
    await ffmpeg(tagBedArgs(path.join(dir, 'tag.wav'), path.join(dir, 'bed.wav'), 12));
    const preview = path.join(dir, 'preview.mp3');
    await ffmpeg(previewArgs(master, path.join(dir, 'bed.wav'), preview, DEFAULT_WATERMARK));
    await ffmpeg(masterArgs(master, path.join(dir, 'master.aiff'), 'aiff'));

    const info = await probe(preview);
    assert.equal(info.bitrateKbps, 128);
    assert.equal(info.sampleRate, 44100);
    assert.ok(Math.abs(info.durationSeconds - 30) < 0.2);
    assert.ok(Math.abs((await probe(path.join(dir, 'master.aiff'))).durationSeconds - 30) < 0.01, 'AIFF master is lossless and full length');

    // The tone is 220 Hz, so energy above 1 kHz can only be the chime. Measure it per half second.
    const { stderr: out } = spawnSync(ffmpegPath(), ['-hide_banner', '-i', preview, '-af',
      'highpass=f=1000,highpass=f=1000,asetnsamples=n=22050,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level',
      '-f', 'null', '-'], { encoding: 'utf8' });
    const frames = [...out.matchAll(/pts_time:([\d.]+)[\s\S]*?RMS_level=(-?[\d.]+|-inf)/g)].map(m => ({ t: Number(m[1]), db: Number(m[2]) }));
    const hits = frames.filter(f => f.db > -60).map(f => Math.round(f.t));
    assert.deepEqual(hits, [3, 15, 27]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('no audio files are committed to the site (they belong in object storage)', () => {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(wav|aiff?|flac|mp3|m4a|ogg)$/i.test(name)) found.push(p);
    }
  };
  if (existsSync('public')) walk('public');
  assert.deepEqual(found, []);
});

test('master links are presigned, expire after 60 s and download as attachments', async () => {
  const saved = { ...process.env };
  Object.assign(process.env, {
    S3_ACCESS_KEY_ID: 'AKIATESTKEY', S3_SECRET_ACCESS_KEY: 'test-secret', S3_REGION: 'us-west-004',
    S3_ENDPOINT: 'https://s3.us-west-004.backblazeb2.com', S3_MASTERS_BUCKET: 'gb2b-masters',
  });
  try {
    const { signedMasterUrl, isStorageConfigured } = await import('../src/lib/storage/s3');
    assert.equal(isStorageConfigured('masters'), true);
    const url = new URL(await signedMasterUrl('masters/titan-ascent.wav', 'titan-ascent.wav'));
    assert.equal(url.host, 's3.us-west-004.backblazeb2.com', 'Backblaze B2 endpoint');
    assert.equal(url.pathname, '/gb2b-masters/masters/titan-ascent.wav', 'path-style for B2');
    assert.equal(url.searchParams.get('X-Amz-Expires'), '60');
    assert.match(url.searchParams.get('response-content-disposition') ?? '', /^attachment; filename="titan-ascent\.wav"$/);
    assert.ok(url.searchParams.get('X-Amz-Signature'));
  } finally {
    process.env = saved;
  }
});
