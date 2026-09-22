import React from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, ArrowRight, Zap, AudioLines } from 'lucide-react';

export function SyncIndemnityBanner() {
  return (
    <section className="w-full relative z-10 py-16 sm:py-20 border-y border-white/[0.06] bg-obsidian-950/60 overflow-hidden">
      {/* Background Image with Cinematic Dark Gradient Vignette Bleed */}
      <div className="absolute inset-0 z-0">
        <img
          src="/banners/banner-festival-stage.jpg"
          alt="Festival stage concert and stadium lights"
          className="w-full h-full object-cover object-center filter brightness-[0.35] contrast-115 saturate-115"
        />
        {/* Layered Obsidian & Warm Amber/Crimson Gradients to seamlessly merge with background */}
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian-950 via-obsidian-950/85 to-obsidian-950/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-transparent to-obsidian-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(220,38,38,0.18),transparent_60%)]" />
      </div>

      {/* Content Container */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-crimson-600/20 text-crimson-300 border border-crimson-500/40 mb-4 backdrop-blur-md shadow-lg shadow-crimson-950/40">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% PRE-CLEARED DIRECT SYNCHRONIZATION</span>
            </div>

            <h3 className="font-syne text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1] drop-shadow-sm">
              Pre-Cleared for Global Commercials,
              <br />
              <span className="text-crimson-gradient text-glow-crimson">Streaming Series &amp; YouTube CID.</span>
            </h3>

            <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl font-jakarta">
              Zero secondary collection societies, zero PRO surprise invoices, and zero copyright strikes. Every license delivers an automatic YouTube Content ID whitelist certificate and broadcast-ready cue-sheet metadata.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center gap-3 mt-6 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] text-zinc-200 border border-white/10 backdrop-blur-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Indemnified Worldwide</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] text-zinc-200 border border-white/10 backdrop-blur-md">
                <AudioLines className="w-3.5 h-3.5 text-crimson-400" />
                <span>Isolated Stems &amp; Alt-Mixes</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] text-zinc-200 border border-white/10 backdrop-blur-md">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>From $10 Perpetual</span>
              </span>
            </div>
          </div>

          {/* CTA & Metrics Group */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3.5 shrink-0">
            <Link
              href="/pricing"
              className="btn-crimson text-white font-extrabold text-xs sm:text-sm px-8 py-4 rounded-xl flex items-center justify-center gap-2.5 shadow-xl shadow-crimson-600/30 hover:scale-105 transition-all"
            >
              <span>Explore Licensing Tiers</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/#catalog"
              className="px-8 py-4 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white text-center transition-colors backdrop-blur-md"
            >
              Audition Catalog Tracks
            </Link>
            <div className="text-center pt-2">
              <span className="text-[11px] font-mono text-zinc-400">
                Instant WAV delivery + stems pack download
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
