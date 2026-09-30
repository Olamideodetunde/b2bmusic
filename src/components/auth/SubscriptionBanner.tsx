'use client';

import React, { useState } from 'react';
import { Check, Infinity as InfinityIcon, Loader2 } from 'lucide-react';
import { formatPlan } from '@/lib/plan';
import { Container } from '@/components/home/primitives';
import { useAuth } from './AuthContext';

/** The all-access plan, shown beside the single-track tiers. Hidden until a plan is configured in Stripe. */
export function SubscriptionBanner() {
  const { me, subscribe } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!me.plan) return null;

  return (
    <section className="pt-12 lg:pt-16">
      <Container>
        <div className="relative overflow-hidden rounded-2xl border border-brand-500/40 bg-gradient-to-br from-brand-600/[0.14] via-navy-900/60 to-navy-950 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-gold-400">
              <InfinityIcon className="w-3.5 h-3.5" /> All-access subscription
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
              Unlock the entire catalog for <span className="font-mono text-brand-400">{formatPlan(me.plan)}</span>
            </h2>
            <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-slate-300">
              {['Every track, including new releases', 'Unlimited WAV & AIFF master downloads', 'Sync license on everything you download', 'Cancel anytime from your account'].map(f => (
                <li key={f} className="flex gap-2"><Check className="w-4 h-4 mt-0.5 text-brand-400 shrink-0" />{f}</li>
              ))}
            </ul>
          </div>
          {me.isSubscribed ? (
            <p className="shrink-0 text-sm font-semibold text-emerald-400">You’re subscribed — everything is unlocked.</p>
          ) : (
            <button
              onClick={async () => { setBusy(true); await subscribe(); setBusy(false); }}
              disabled={busy}
              className="shrink-0 h-12 px-7 rounded-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Subscribe · {formatPlan(me.plan)}
            </button>
          )}
        </div>
      </Container>
    </section>
  );
}
