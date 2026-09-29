'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { CheckCircle2, Lock, ArrowRight, Loader2, ShieldCheck, Zap, Globe, Tv, Check, AlertTriangle, FlaskConical } from 'lucide-react';
import { Track } from '@/lib/db/types';
import { formatPrice } from '@/lib/utils';
import { LICENSE_TIERS, tierPriceCents, type LicenseTierKey } from '@/lib/licensing';

interface CheckoutCTAProps {
  track: Track;
  layout?: 'sidebar' | 'grid';
  className?: string;
}

const TIER_ICONS: Record<LicenseTierKey, React.ReactNode> = {
  standard: <Globe className="w-3.5 h-3.5" />,
  commercial: <Zap className="w-3.5 h-3.5" />,
  broadcast: <Tv className="w-3.5 h-3.5" />,
};
const TIER_COLORS: Record<LicenseTierKey, string> = {
  standard: 'text-zinc-300',
  commercial: 'text-crimson-400',
  broadcast: 'text-purple-400',
};

type Confirmation = { state: 'checking' } | { state: 'paid'; tierName: string | null; email: string | null } | { state: 'unverified' };

function CheckoutCTAContent({ track, className = '' }: CheckoutCTAProps) {
  const [selectedTier, setSelectedTier] = useState<LicenseTierKey>('commercial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  // Returning from Stripe: confirm with the server rather than trusting the URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'success') return;
    const sessionId = params.get('session_id');
    if (!sessionId) return;

    setConfirmation({ state: 'checking' });
    fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`)
      .then(r => r.json())
      .then(d => setConfirmation(d.paid ? { state: 'paid', tierName: d.tierName, email: d.email } : { state: 'unverified' }))
      .catch(() => setConfirmation({ state: 'unverified' }));
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: track.slug, tier: selectedTier }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.demo) setDemo(true);
      else setError(data.error ?? 'Checkout is unavailable right now — please try again or contact licensing.');
    } catch {
      setError('Could not reach checkout — check your connection and try again.');
    }
    setLoading(false);
  };

  if (confirmation?.state === 'checking') {
    return (
      <div className={`p-5 flex items-center gap-2 text-sm text-zinc-400 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" /> Confirming your purchase…
      </div>
    );
  }

  if (confirmation?.state === 'paid') {
    return (
      <div className={`p-5 ${className}`}>
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span className="label-xs !text-emerald-400">License confirmed</span>
        </div>
        <h3 className="text-lg font-bold tracking-tight mt-3">Thank you — you&apos;re licensed.</h3>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          {confirmation.tierName ? <>Your <span className="text-zinc-200">{confirmation.tierName}</span> license for </> : 'Your license for '}
          <span className="text-zinc-200">&ldquo;{track.title}&rdquo;</span> is active. A receipt
          {confirmation.email ? <> has been sent to <span className="font-mono text-zinc-300">{confirmation.email}</span></> : ' is on its way'}.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-5 ${className}`}>
      {confirmation?.state === 'unverified' && (
        <div className="mb-4 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          We couldn&apos;t confirm that payment. If you were charged, your receipt email is your proof of license — or contact licensing.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="label-xs">Commercial sync license</span>
        <span className="inline-flex items-center h-5 px-1.5 rounded-sm text-[9px] font-mono font-medium uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
          100% Pre-cleared
        </span>
      </div>
      <p className="text-xs text-zinc-500 mt-1">Perpetual license · no subscription</p>

      {/* Tier radio list */}
      <div className="mt-4 border border-white/[0.08] rounded-lg divide-y divide-white/[0.06] overflow-hidden" role="radiogroup" aria-label="License tier">
        {LICENSE_TIERS.map((tier) => {
          const isSelected = selectedTier === tier.key;
          return (
            <button
              key={tier.key}
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelectedTier(tier.key)}
              className={`w-full text-left px-3.5 py-3 transition-colors ${
                isSelected ? 'bg-crimson-600/[0.08] shadow-[inset_2px_0_0_#DC2626]' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-3.5 h-3.5 rounded-full border inline-flex items-center justify-center shrink-0 ${isSelected ? 'border-crimson-500 bg-crimson-600 text-white' : 'border-obsidian-500'}`}>
                  {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                </span>
                <span className={TIER_COLORS[tier.key]}>{TIER_ICONS[tier.key]}</span>
                <span className={`flex-1 text-[13px] font-medium ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                  {tier.name} <span className="text-zinc-500 font-normal">· {tier.label}</span>
                </span>
                <span className="text-sm font-mono font-semibold tabular-nums text-white">{formatPrice(tierPriceCents(track, tier.key))}</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-snug mt-1 pl-6">{tier.summary}</p>
            </button>
          );
        })}
      </div>

      {/* Selected tier inclusions */}
      {(() => {
        const tier = LICENSE_TIERS.find(t => t.key === selectedTier)!;
        return (
          <ul className="mt-4 space-y-1.5">
            {tier.features.map((f) => (
              <li key={f} className="flex items-start gap-1.5 text-xs text-zinc-300">
                <Check className="w-3 h-3 text-crimson-400 shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
            <li className="text-[10px] font-mono text-zinc-500 pl-[18px] pt-0.5">{tier.scope}</li>
          </ul>
        );
      })()}

      {/* CTA */}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="mt-5 w-full h-11 rounded-full bg-crimson-600 hover:bg-crimson-500 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Opening secure checkout…
          </>
        ) : (
          <>
            License &amp; download
            <span className="font-mono tabular-nums opacity-90">{formatPrice(tierPriceCents(track, selectedTier))}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {error && (
        <p role="alert" className="mt-3 flex gap-1.5 text-xs text-crimson-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {error}
        </p>
      )}
      {demo && (
        <p role="status" className="mt-3 flex gap-1.5 rounded-md border border-white/10 bg-white/[0.03] p-2.5 text-xs text-zinc-400">
          <FlaskConical className="w-3.5 h-3.5 shrink-0 mt-px text-zinc-300" />
          Demo mode: Stripe isn&apos;t configured on this environment, so no payment was taken. Add STRIPE_SECRET_KEY to enable checkout.
        </p>
      )}

      {/* Trust */}
      <div className="mt-5 pt-4 border-t border-white/[0.06] space-y-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          100% pre-cleared worldwide sync
        </div>
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          Secure payment by Stripe · receipt by email
        </div>
        <a
          href="mailto:licensing@b2bproductionmusic.com?subject=Enterprise%20Custom%20Sync%20Inquiry"
          className="block pt-1 font-mono text-[11px] text-zinc-500 hover:text-crimson-400 transition-colors"
        >
          Custom enterprise buyout →
        </a>
      </div>
    </div>
  );
}

export function CheckoutCTA(props: CheckoutCTAProps) {
  return (
    <Suspense fallback={<div className="p-5 text-xs text-zinc-500">Loading licensing options…</div>}>
      <CheckoutCTAContent {...props} />
    </Suspense>
  );
}
