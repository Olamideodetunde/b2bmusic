'use client';

import React, { useState, Suspense } from 'react';
import { Track } from '@/lib/db/types';
import { formatPrice } from '@/lib/utils';
import { CheckCircle2, Lock, ArrowRight, Loader2, Download, ShieldCheck, Zap, Globe, Tv, Check } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface CheckoutCTAProps {
  track: Track;
  layout?: 'sidebar' | 'grid';
  className?: string;
}

function CheckoutCTAContent({ track, layout = 'sidebar', className = '' }: CheckoutCTAProps) {
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
      <div className="glass-panel border-emerald-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-emerald-950/40">
        <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="font-syne text-xl sm:text-2xl font-black text-white mb-2">Synchronization License Issued</h3>
        <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto mb-6">
          Your perpetual sync agreement for <strong>&ldquo;{track.title}&rdquo;</strong> is confirmed.
          Master WAV, isolated stems, and the indemnified cue sheet have been prepared.
        </p>
        <div className="inline-flex items-center gap-2 btn-crimson text-white font-bold px-6 py-3 rounded-xl cursor-pointer shadow-xl shadow-crimson-600/40 text-xs sm:text-sm">
          <Download className="w-4 h-4" />
          <span>Download Master Package (.ZIP)</span>
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
      description: 'YouTube, podcasts, social reels, internal corporate decks & websites.',
      features: [
        'Unlimited online views & streams',
        'Master 24-bit WAV & 320kbps MP3',
        'YouTube Content ID Whitelisting',
      ],
      footer: 'Perpetual single-project clearance',
    },
    {
      key: 'agency' as const,
      label: 'Commercial & Ads',
      icon: <Zap className="w-4 h-4" />,
      color: 'text-crimson-400',
      badge: 'Recommended',
      description: 'Client projects, paid digital ads (Meta/TikTok/Google), trade shows, promos.',
      features: [
        'All Web rights + Paid Digital Ads',
        'Full Isolated Stems Archive included',
        'All Alt-Mixes & Cutdowns (:60, :30, :15)',
        'Full agency client transfer permitted',
      ],
      footer: 'Agency client handover permitted',
    },
    {
      key: 'broadcast' as const,
      label: 'Full Buyout & TV',
      icon: <Tv className="w-4 h-4" />,
      color: 'text-purple-400',
      badge: null,
      description: 'Linear TV commercials, Netflix/OTT streaming, theatrical films, video games.',
      features: [
        'Worldwide TV & OTT Synchronization',
        'Unlimited media spend & broadcast reach',
        'Full Stems + 30s/60s Broadcast Cuts',
        'Full legal indemnification & cue-sheet filing',
      ],
      footer: 'Official Cue Sheet & ISRC registration',
    },
  ];

  return (
    <div className={`glass-panel rounded-3xl p-5 sm:p-6 relative shadow-2xl overflow-hidden border border-white/10 ${className}`}>
      {/* Ambient Crimson Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-crimson-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="pb-4 mb-4 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-mono font-bold text-crimson-400 uppercase tracking-widest">
            Commercial Sync License
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 font-bold">
            100% Pre-Cleared
          </span>
        </div>
        <h3 className="font-syne text-xl sm:text-2xl font-black text-white tracking-tight">
          Select Your Rights
        </h3>
        <p className="text-xs text-zinc-400 mt-1 font-jakarta">
          Perpetual license. Zero recurring subscription fees.
        </p>
      </div>

      {/* 3 Selectable Tier Cards (Vertical Stack for Musicbed / PremiumBeat Sidebar feel) */}
      <div className="space-y-3 mb-5 relative z-10">
        {tiers.map((tier) => {
          const isSelected = selectedTier === tier.key;
          return (
            <div
              key={tier.key}
              onClick={() => setSelectedTier(tier.key)}
              className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                isSelected
                  ? 'border-crimson-500 bg-crimson-600/15 shadow-xl shadow-crimson-600/20 ring-1 ring-crimson-500'
                  : 'border-white/10 bg-obsidian-900/60 hover:border-white/20 hover:bg-obsidian-850/80'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-2.5 right-4 bg-crimson-600 text-white text-[9px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md shadow-crimson-600/50">
                  {tier.badge}
                </div>
              )}

              {/* Tier Header Line */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected ? 'border-crimson-400 bg-crimson-500 text-white' : 'border-zinc-500 bg-obsidian-900'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider font-syne ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                    {tier.label}
                  </span>
                </div>
                <div className="font-mono text-lg font-black text-white">
                  {formatPrice(tierPrices[tier.key])}
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed pl-6">
                {tier.description}
              </p>

              {/* Active Features Breakdown */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-white/[0.08] pl-6 space-y-1.5">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-start gap-1.5 text-[11px] text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-crimson-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                  <div className="text-[10px] font-mono text-zinc-500 pt-1">
                    ✓ {tier.footer}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA Button */}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full py-3.5 px-5 rounded-2xl btn-crimson disabled:opacity-50 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-2xl shadow-crimson-600/40 relative z-10 hover:scale-[1.02]"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting Stripe Checkout...</span>
          </>
        ) : (
          <>
            <span>License &amp; Download</span>
            <span className="font-mono font-normal opacity-95">
              ({formatPrice(tierPrices[selectedTier])})
            </span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Trust & Guarantee Indicators */}
      <div className="mt-4 pt-3.5 border-t border-white/[0.08] space-y-2 text-[11px] text-zinc-400 relative z-10">
        <div className="flex items-center gap-2 text-zinc-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>100% Pre-Cleared Worldwide Sync</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-crimson-400 shrink-0" />
          <span>Instant WAV + Stems Download via Stripe</span>
        </div>
        <div className="pt-1 text-center">
          <a
            href="mailto:licensing@b2bproductionmusic.com?subject=Enterprise%20Custom%20Sync%20Inquiry"
            className="text-crimson-400 hover:text-crimson-300 font-mono text-[10px] underline"
          >
            Need custom Enterprise Buyout?
          </a>
        </div>
      </div>
    </div>
  );
}

export function CheckoutCTA(props: CheckoutCTAProps) {
  return (
    <Suspense fallback={
      <div className="glass-panel rounded-3xl p-6 text-center text-zinc-400 animate-pulse">
        Loading commercial sync licensing options...
      </div>
    }>
      <CheckoutCTAContent {...props} />
    </Suspense>
  );
}
