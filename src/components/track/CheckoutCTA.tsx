'use client';

import React, { useState, Suspense } from 'react';
import { Track } from '@/lib/db/types';
import { formatPrice } from '@/lib/utils';
import { CheckCircle2, Lock, ArrowRight, Loader2, Download, ShieldCheck, Zap, Globe, Tv } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface CheckoutCTAProps {
  track: Track;
}

function CheckoutCTAContent({ track }: CheckoutCTAProps) {
  const [selectedTier, setSelectedTier] = useState<'standard' | 'agency' | 'broadcast'>('agency');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('checkout_success') === 'true';

  const tierPrices = {
    standard: track.standardPriceCents,
    agency: track.agencyPriceCents || 2000,
    broadcast: track.broadcastPriceCents,
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: track.slug, tier: selectedTier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Unable to initialize checkout session: ' + (data.error || 'Unknown error'));
        setLoading(false);
      }
    } catch (err: any) {
      alert('Checkout error: ' + err.message);
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="glass-panel border-emerald-500/40 rounded-3xl p-8 text-center my-8 shadow-2xl shadow-emerald-950/40">
        <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="font-syne text-2xl font-black text-white mb-2">Synchronization License Issued</h3>
        <p className="text-sm text-zinc-300 max-w-lg mx-auto mb-6">
          Your perpetual sync agreement for <strong>&ldquo;{track.title}&rdquo;</strong> is confirmed.
          Master WAV, isolated stems, and the indemnified cue sheet have been prepared.
        </p>
        <div className="inline-flex items-center gap-2 btn-crimson text-white font-bold px-7 py-3.5 rounded-xl cursor-pointer shadow-xl shadow-crimson-600/40">
          <Download className="w-5 h-5" />
          <span>Download Master Production Package (.ZIP)</span>
        </div>
      </div>
    );
  }

  const tiers = [
    {
      key: 'standard' as const,
      label: 'Web & Social',
      icon: <Globe className="w-4 h-4" />,
      color: 'text-zinc-300',
      badge: null,
      description: 'YouTube, podcasts, social reels, internal decks, and websites.',
      features: [
        'Unlimited online views & streams',
        'Full Master WAV (24-bit / 48kHz)',
        'YouTube Content ID Whitelist',
      ],
      footer: 'Perpetual single-project license',
    },
    {
      key: 'agency' as const,
      label: 'Broadcast & Sync',
      icon: <Zap className="w-4 h-4" />,
      color: 'text-crimson-400',
      badge: 'Most Popular',
      description: 'Client work, paid ads up to $50k spend, trade shows, and promos.',
      features: [
        'All Web rights + Paid Digital Ads',
        'Full Stems Archive Included',
        'All Alt-Mixes & Cutdowns (:60, :30)',
        'Client handover clearance rights',
      ],
      footer: 'Agency client transfer permitted',
    },
    {
      key: 'broadcast' as const,
      label: 'Full Buyout',
      icon: <Tv className="w-4 h-4" />,
      color: 'text-purple-400',
      badge: null,
      description: 'TV commercials, Netflix / OTT streaming, theatrical films, gaming.',
      features: [
        'Worldwide TV & OTT Synchronization',
        'Unlimited media / ad spend',
        'Full Stems + 30s / 60s Broadcast Cuts',
        'Complete legal indemnification',
      ],
      footer: 'Official Cue Sheet & ISRC registration',
    },
  ];

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 relative my-8 shadow-2xl overflow-hidden">
      {/* Ambient Crimson Spotlight */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-crimson-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7 pb-5 border-b border-white/[0.08] relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-crimson-400 uppercase tracking-widest">
              Direct Commercial Synchronization
            </span>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25 font-medium">
              100% Pre-Cleared
            </span>
          </div>
          <h2 className="font-syne text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
            Select Your Production Rights
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-300 bg-obsidian-900/80 px-3.5 py-2 rounded-xl border border-white/10 self-start sm:self-auto backdrop-blur-md">
          <Lock className="w-3.5 h-3.5 text-crimson-500" />
          <span>Instant Checkout via Stripe • No Subscription</span>
        </div>
      </div>

      {/* 3-Tier Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7 relative z-10">
        {tiers.map((tier) => {
          const isSelected = selectedTier === tier.key;
          return (
            <div
              key={tier.key}
              onClick={() => setSelectedTier(tier.key)}
              className={`cursor-pointer rounded-2xl p-6 border transition-all flex flex-col justify-between relative backdrop-blur-xl ${
                isSelected
                  ? 'border-crimson-500 bg-crimson-600/15 shadow-2xl shadow-crimson-600/25 scale-[1.02]'
                  : 'border-white/10 bg-obsidian-900/60 hover:border-white/20 hover:bg-obsidian-850/80'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 right-4 bg-crimson-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-lg shadow-crimson-600/40">
                  {tier.badge}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`${tier.color}`}>{tier.icon}</span>
                  <span className={`font-jakarta text-xs font-bold uppercase tracking-wider ${tier.color}`}>
                    {tier.label}
                  </span>
                  {isSelected && <span className="ml-auto w-2 h-2 rounded-full bg-crimson-500 animate-ping" />}
                </div>
                <div className="font-mono text-3xl font-black text-white mb-1 drop-shadow-sm">
                  {formatPrice(tierPrices[tier.key])}
                </div>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">{tier.description}</p>
                <ul className="space-y-2 text-xs text-zinc-300">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-crimson-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 pt-3 border-t border-white/[0.08] text-[11px] text-zinc-500">
                {tier.footer}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Button */}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full py-4 px-6 rounded-2xl btn-crimson disabled:opacity-50 text-white font-extrabold text-base flex items-center justify-center gap-3 transition-all shadow-2xl shadow-crimson-600/40 relative z-10"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Securing Licensing Session...</span>
          </>
        ) : (
          <>
            <span>License &amp; Download Instantly</span>
            <span className="font-mono font-normal opacity-90">
              ({formatPrice(tierPrices[selectedTier])})
            </span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>

      {/* Trust Indicators */}
      <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between text-xs text-zinc-400 gap-2 relative z-10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" /> 100% Direct Pre-Cleared
          </span>
          <span>•</span>
          <span>No CMO / PRO Collection Entanglements</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Perpetual Worldwide Rights</span>
        </div>
        <a
          href="mailto:licensing@b2bproductionmusic.com?subject=Enterprise%20Custom%20Sync%20Inquiry"
          className="text-crimson-400 hover:text-crimson-300 font-medium underline"
        >
          Need Enterprise Buyout?
        </a>
      </div>
    </div>
  );
}

export function CheckoutCTA(props: CheckoutCTAProps) {
  return (
    <Suspense fallback={
      <div className="glass-panel rounded-3xl p-8 text-center text-zinc-400 animate-pulse">
        Loading commercial sync licensing options...
      </div>
    }>
      <CheckoutCTAContent {...props} />
    </Suspense>
  );
}
