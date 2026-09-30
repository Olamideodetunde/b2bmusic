'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Infinity as InfinityIcon, Loader2, Mail, Music2, X } from 'lucide-react';
import type { Track } from '@/lib/db/types';
import type { Plan } from '@/lib/plan';
import { formatPlan } from '@/lib/plan';
import { formatPrice } from '@/lib/utils';
import { Modal } from './Modal';

export interface Me {
  user: { email: string } | null;
  isSubscribed: boolean;
  subscription: { status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null;
  purchasedTrackIds: number[];
  plan: Plan | null;
}

export type Access = 'subscription' | 'purchase' | null;
export type MasterFormat = 'wav' | 'aiff';

interface UnlockOptions {
  /** Runs the single-track purchase (the track page passes its tier checkout). */
  onBuySingle?: () => void;
  /** Label for the single-track price, e.g. "Commercial · $20". Defaults to "from <standard>". */
  singleLabel?: string;
}

interface AuthContextType {
  me: Me;
  loading: boolean;
  refresh: () => Promise<void>;
  accessFor: (trackId: number) => Access;
  openSignIn: () => void;
  openUnlock: (track: Track, options?: UnlockOptions) => void;
  subscribe: () => Promise<void>;
  /** Starts a master download, or explains why it can't (sign in / unlock / error). */
  download: (track: Track, format: MasterFormat) => Promise<void>;
  signOut: () => Promise<void>;
  openBillingPortal: () => Promise<void>;
  notify: (message: string, tone?: 'info' | 'error') => void;
}

const EMPTY: Me = { user: null, isSubscribed: false, subscription: null, purchasedTrackIds: [], plan: null };
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const currentPath = () => window.location.pathname + window.location.hash;

/** Messages for the query flags our auth/download redirects add to the URL. */
const FLAG_MESSAGES: Record<string, Record<string, [string, 'info' | 'error']>> = {
  signin: { ok: ['You’re signed in.', 'info'], expired: ['That sign-in link has expired or was already used. Request a new one.', 'error'] },
  subscribed: { '1': ['Welcome aboard — your subscription is active. Every track is now unlocked.', 'info'] },
  download: {
    sign_in_required: ['Sign in to download the master.', 'error'],
    license_required: ['Subscribe or license this track to download the master.', 'error'],
    link_expired: ['That download link has expired. Sign in with your purchase email to download again.', 'error'],
    master_unavailable: ['The master for this track isn’t available yet — our licensing team will send it.', 'error'],
    limit_reached: ['Daily download limit reached. Try again tomorrow.', 'error'],
    storage_unavailable: ['Downloads are temporarily unavailable. Please try again shortly.', 'error'],
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [signInOpen, setSignInOpen] = useState(false);
  const [unlock, setUnlock] = useState<{ track: Track; options: UnlockOptions } | null>(null);
  const [notice, setNotice] = useState<{ message: string; tone: 'info' | 'error' } | null>(null);

  const notify = useCallback((message: string, tone: 'info' | 'error' = 'info') => setNotice({ message, tone }), []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store', credentials: 'same-origin' });
      setMe(res.ok ? ((await res.json()) as Me) : EMPTY);
    } catch {
      setMe(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Show (then strip) the one-shot flags left by sign-in / checkout / download redirects.
    const url = new URL(window.location.href);
    let changed = false;
    for (const [flag, messages] of Object.entries(FLAG_MESSAGES)) {
      const value = url.searchParams.get(flag);
      if (value && messages[value]) {
        notify(...messages[value]);
        url.searchParams.delete(flag);
        changed = true;
      }
    }
    if (changed) window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, [refresh, notify]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), notice.tone === 'error' ? 9000 : 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const accessFor = useCallback(
    (trackId: number): Access => (me.isSubscribed ? 'subscription' : me.purchasedTrackIds.includes(trackId) ? 'purchase' : null),
    [me],
  );

  const subscribe = useCallback(async () => {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ next: currentPath() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) window.location.assign(data.url);
    else notify(data.error || 'Could not start the subscription. Please try again.', 'error');
  }, [notify]);

  const openUnlock = useCallback((track: Track, options: UnlockOptions = {}) => setUnlock({ track, options }), []);

  const download = useCallback(
    async (track: Track, format: MasterFormat) => {
      const res = await fetch(`/api/download/${track.id}?format=${format}&mode=json`, { cache: 'no-store', credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.assign(data.url); // signed URL answers with Content-Disposition: attachment
        return;
      }
      if (res.status === 401) setSignInOpen(true);
      else if (res.status === 403) openUnlock(track);
      else notify(data.message || 'Download failed. Please try again.', 'error');
    },
    [notify, openUnlock],
  );

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setMe(prev => ({ ...EMPTY, plan: prev.plan }));
    notify('Signed out.');
    router.refresh();
  }, [notify, router]);

  const openBillingPortal = useCallback(async () => {
    const res = await fetch('/api/billing-portal', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) window.location.assign(data.url);
    else notify(data.error || 'Billing portal is unavailable.', 'error');
  }, [notify]);

  const value = useMemo<AuthContextType>(
    () => ({ me, loading, refresh, accessFor, openSignIn: () => setSignInOpen(true), openUnlock, subscribe, download, signOut, openBillingPortal, notify }),
    [me, loading, refresh, accessFor, openUnlock, subscribe, download, signOut, openBillingPortal, notify],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
      <UnlockModal
        state={unlock}
        me={me}
        onClose={() => setUnlock(null)}
        onSignIn={() => { setUnlock(null); setSignInOpen(true); }}
        onSubscribe={subscribe}
        onBrowse={(track) => { setUnlock(null); router.push(`/tracks/${track.slug}#license`); }}
      />
      {notice && (
        <div
          role="status"
          className={`fixed left-1/2 -translate-x-1/2 bottom-[88px] z-[70] w-[min(92vw,520px)] flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl shadow-black/60 ${
            notice.tone === 'error' ? 'bg-navy-900 border-amber-500/40 text-amber-100' : 'bg-navy-900 border-brand-500/40 text-slate-100'
          }`}
        >
          <span className="flex-1">{notice.message}</span>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ─── Sign-in (magic link) ─────────────────────────────────────────

function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setState('idle'); setError(null); setDevLink(null); }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    setError(null);
    const res = await fetch('/api/auth/request-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, next: currentPath() }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setState('sent');
      setDevLink(data.devLink ?? null);
    } else {
      setState('idle');
      setError(data.error || 'Could not send the link. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="signin-title">
      <div className="p-6 sm:p-8">
        <div className="w-10 h-10 rounded-full bg-brand-600/15 border border-brand-500/30 flex items-center justify-center mb-5">
          <Mail className="w-4 h-4 text-brand-400" />
        </div>
        <h2 id="signin-title" className="text-xl font-bold tracking-tight">Sign in</h2>
        {state === 'sent' ? (
          <div className="mt-3 text-sm text-slate-300 leading-relaxed">
            <p>We’ve emailed a sign-in link to <strong className="text-white">{email}</strong>. It works once and expires in 20 minutes.</p>
            {devLink && (
              <a href={devLink} className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono text-brand-400 hover:text-brand-300">
                Development: open the sign-in link <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-3">
            <p className="text-sm text-slate-400 leading-relaxed">
              No password needed — we’ll email you a secure one-time link. Use the address you subscribed or purchased with.
            </p>
            <label htmlFor="signin-email" className="label-xs mt-5 block">Email</label>
            <input
              id="signin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1.5 w-full h-11 px-3.5 rounded-lg bg-navy-950 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              placeholder="you@studio.com"
            />
            {error && <p className="mt-2 text-xs text-amber-300">{error}</p>}
            <button
              type="submit"
              disabled={state === 'sending'}
              className="mt-5 w-full h-11 rounded-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              {state === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Email me a sign-in link
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}

// ─── The conditional CTA: subscribe OR buy this one track ─────────

function UnlockModal({
  state,
  me,
  onClose,
  onSignIn,
  onSubscribe,
  onBrowse,
}: {
  state: { track: Track; options: UnlockOptions } | null;
  me: Me;
  onClose: () => void;
  onSignIn: () => void;
  onSubscribe: () => Promise<void>;
  onBrowse: (track: Track) => void;
}) {
  const [busy, setBusy] = useState<'sub' | 'single' | null>(null);
  useEffect(() => setBusy(null), [state]);
  if (!state) return null;
  const { track, options } = state;
  const plan = me.plan;
  const singleLabel = options.singleLabel ?? `From ${formatPrice(track.standardPriceCents)}`;

  const buySingle = () => {
    setBusy('single');
    if (options.onBuySingle) {
      onClose();
      options.onBuySingle();
    } else {
      onBrowse(track);
    }
  };

  return (
    <Modal open onClose={onClose} labelledBy="unlock-title" className="sm:max-w-2xl">
      <div className="p-6 sm:p-8">
        <p className="label-xs">Download the master</p>
        <h2 id="unlock-title" className="mt-2 text-xl sm:text-2xl font-bold tracking-tight pr-8">
          Unlock <span className="text-brand-400">{track.title}</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400">Choose how you’d like to license it. Full-quality WAV/AIFF masters, one-stop cleared.</p>

        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          {/* Option 1 — subscription */}
          <div className="relative flex flex-col rounded-xl border border-brand-500/50 bg-brand-600/[0.08] p-5">
            <span className="absolute -top-2.5 left-5 px-2 h-5 inline-flex items-center rounded-full bg-gold-500 text-navy-950 text-[10px] font-mono font-bold uppercase tracking-wider">
              Best value
            </span>
            <InfinityIcon className="w-5 h-5 text-brand-400" />
            <h3 className="mt-3 text-base font-semibold text-white">Subscribe &amp; unlock everything</h3>
            {plan
              ? <p className="mt-1 text-2xl font-mono font-medium text-white">{formatPlan(plan)}</p>
              : <p className="mt-2 text-sm font-mono text-slate-400">Coming soon</p>}
            <ul className="mt-3 space-y-1.5 text-xs text-slate-300 flex-1">
              {['Every track in the catalog', 'Unlimited WAV & AIFF downloads', 'Sync license on everything you download', 'Cancel anytime'].map(f => (
                <li key={f} className="flex gap-2"><Check className="w-3.5 h-3.5 mt-px text-brand-400 shrink-0" />{f}</li>
              ))}
            </ul>
            <button
              data-autofocus
              onClick={async () => { setBusy('sub'); await onSubscribe(); setBusy(null); }}
              disabled={!plan || busy !== null}
              className="mt-5 h-11 rounded-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:hover:bg-brand-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              {busy === 'sub' && <Loader2 className="w-4 h-4 animate-spin" />}
              {plan ? `Subscribe · ${formatPlan(plan)}` : 'Subscriptions launching soon'}
            </button>
          </div>

          {/* Option 2 — single track */}
          <div className="flex flex-col rounded-xl border border-white/10 bg-navy-950/60 p-5">
            <Music2 className="w-5 h-5 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-white">Buy a single-track sync license</h3>
            <p className="mt-1 text-2xl font-mono font-medium text-white">{singleLabel}</p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-300 flex-1">
              {['This track only, perpetual license', 'WAV & AIFF master + stems', 'Choose Web, Commercial or Broadcast'].map(f => (
                <li key={f} className="flex gap-2"><Check className="w-3.5 h-3.5 mt-px text-slate-500 shrink-0" />{f}</li>
              ))}
            </ul>
            <button
              onClick={buySingle}
              disabled={busy !== null}
              className="mt-5 h-11 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/[0.04] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              {busy === 'single' && <Loader2 className="w-4 h-4 animate-spin" />}
              {options.onBuySingle ? 'Continue to checkout' : 'Choose a license'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!me.user && (
          <p className="mt-5 text-center text-xs text-slate-400">
            Already subscribed or bought this track?{' '}
            <button onClick={onSignIn} className="text-brand-400 hover:text-brand-300 font-medium">Sign in</button>
          </p>
        )}
      </div>
    </Modal>
  );
}
