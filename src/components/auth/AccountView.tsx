'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Download, Infinity as InfinityIcon, Loader2, Music2 } from 'lucide-react';
import type { Track } from '@/lib/db/types';
import { formatPlan } from '@/lib/plan';
import { Container } from '@/components/home/primitives';
import { CoverImage } from '@/components/ui/CoverImage';
import { useAuth } from './AuthContext';

export function AccountView() {
  const { me, loading, openSignIn, subscribe, openBillingPortal, download } = useAuth();
  const [tracks, setTracks] = useState<Track[] | null>(null);

  const ids = me.purchasedTrackIds.join(',');
  useEffect(() => {
    if (!ids) { setTracks([]); return; }
    fetch(`/api/catalog?ids=${ids}`)
      .then(r => r.json())
      .then(d => setTracks(d.tracks ?? []))
      .catch(() => setTracks([]));
  }, [ids]);

  const card = 'rounded-2xl border border-white/[0.08] bg-navy-900/30 p-6';

  if (loading) {
    return <Container className="py-16 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading your account…</Container>;
  }

  if (!me.user) {
    return (
      <Container className="py-16">
        <div className={`${card} max-w-lg`}>
          <h2 className="text-xl font-bold tracking-tight">Sign in to see your downloads</h2>
          <p className="mt-2 text-sm text-slate-400">Use the email you subscribed or purchased with. We’ll send you a one-time sign-in link.</p>
          <button onClick={openSignIn} className="mt-5 h-11 px-6 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold">
            Email me a sign-in link
          </button>
        </div>
      </Container>
    );
  }

  const renews = me.subscription?.currentPeriodEnd
    ? new Date(me.subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <Container className="py-12 lg:py-16 space-y-6">
      <p className="text-sm text-slate-400">Signed in as <span className="font-mono text-slate-200">{me.user.email}</span></p>

      {/* Plan */}
      <section className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="w-10 h-10 shrink-0 rounded-full bg-brand-600/15 border border-brand-500/30 flex items-center justify-center">
              <InfinityIcon className="w-4 h-4 text-brand-400" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {me.isSubscribed ? 'All-access subscription' : 'No active subscription'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {me.isSubscribed
                  ? <>Every track in the catalog is included — download masters from any track page.{renews && <> {me.subscription?.cancelAtPeriodEnd ? 'Ends' : 'Renews'} {renews}.</>}</>
                  : me.subscription
                    ? `Your last subscription is ${me.subscription.status.replace('_', ' ')}.`
                    : me.plan ? `Unlock every track for ${formatPlan(me.plan)}.` : 'Subscriptions are launching soon.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {!me.isSubscribed && me.plan && (
              <button onClick={subscribe} className="h-10 px-5 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold">
                Subscribe · {formatPlan(me.plan)}
              </button>
            )}
            {(me.subscription || me.purchasedTrackIds.length > 0) && (
              <button onClick={openBillingPortal} className="h-10 px-4 rounded-full border border-white/15 text-sm text-slate-200 hover:text-white hover:border-white/30 inline-flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Billing
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Single-track licenses */}
      <section className={card}>
        <h2 className="text-lg font-bold tracking-tight">Licensed tracks</h2>
        {tracks === null ? (
          <p className="mt-3 text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
        ) : tracks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            No single-track licenses yet. <Link href="/#catalog" className="text-brand-400 hover:text-brand-300">Browse the catalog</Link>.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {tracks.map(t => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                {t.coverImageUrl
                  ? <CoverImage src={t.coverImageUrl} alt="" size={40} className="w-10 h-10 rounded object-cover border border-white/10" />
                  : <span className="w-10 h-10 rounded bg-navy-800 flex items-center justify-center"><Music2 className="w-4 h-4 text-navy-400" /></span>}
                <Link href={`/tracks/${t.slug}`} className="flex-1 min-w-0 truncate text-sm font-semibold text-white hover:text-brand-400">{t.title}</Link>
                {(['wav', 'aiff'] as const).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => download(t, fmt)}
                    className="h-8 px-3 rounded-md border border-white/10 text-xs font-mono text-slate-200 hover:text-white hover:bg-white/[0.04] inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> {fmt.toUpperCase()}
                  </button>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
