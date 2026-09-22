import React from 'react';
import Link from 'next/link';
import { Globe, ArrowRight, ShieldCheck, CheckCircle2, Sparkles, Tv } from 'lucide-react';

export function GlobalBroadcastBanner() {
  return (
    <section className="w-full relative z-10 py-20 sm:py-24 border-y border-white/[0.08] bg-obsidian-950/80 overflow-hidden">
      {/* Background Image with Cinematic Toned Gradient Vignette */}
      <div className="absolute inset-0 z-0">
        <img
          src="/banners/banner-paris-concert.jpg"
          alt="Eiffel Tower concert crowd and stadium sync lighting"
          className="w-full h-full object-cover object-center filter brightness-[0.45] contrast-120 saturate-110"
        />
        {/* Softened Obsidian Gradients so image breathes naturally */}
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian-950 via-obsidian-950/80 to-obsidian-950/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-transparent to-obsidian-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.22),transparent_65%)]" />
      </div>

      {/* Content Container */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12">
          
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-crimson-600/20 text-crimson-300 border border-crimson-500/40 mb-4 backdrop-blur-md shadow-lg shadow-crimson-950/40">
              <Globe className="w-3.5 h-3.5 text-crimson-400" />
              <span>WORLDWIDE BROADCAST &amp; LIVE ARENA CLEARANCE</span>
            </div>

            <h3 className="font-syne text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.08] drop-shadow-sm">
              Music That Fills Stadiums,
              <br />
              <span className="text-crimson-gradient text-glow-crimson">
                Screened on Global Broadcasts.
              </span>
            </h3>

            <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl font-jakarta">
              From global television spots and OTT film trailers to stadium concerts and digital brand campaigns. Every track ships with isolated 24-bit stems, broadcast cutdowns (:60, :30, :15), and guaranteed worldwide synchronization indemnification.
            </p>

            {/* Benefit Pills */}
            <div className="flex flex-wrap items-center gap-3 mt-6 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] text-zinc-200 border border-white/10 backdrop-blur-md">
                <Tv className="w-3.5 h-3.5 text-crimson-400" />
                <span>Linear TV &amp; Theatrical Clear</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] text-zinc-200 border border-white/10 backdrop-blur-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero CMO / PRO Surprise Bills</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] text-zinc-200 border border-white/10 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant High-Res Delivery</span>
              </span>
            </div>
          </div>

          {/* CTA Group */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3.5 shrink-0">
            <Link
              href="/pricing"
              className="btn-crimson text-white font-extrabold text-sm px-8 py-4 rounded-xl flex items-center justify-center gap-2.5 shadow-2xl shadow-crimson-600/30 hover:scale-105 transition-all"
            >
              <span>View License Matrix</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/#catalog"
              className="px-8 py-4 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white text-center transition-colors backdrop-blur-md"
            >
              Audition Broadcast Tracks
            </Link>
            <div className="pt-2 text-center lg:text-left">
              <span className="text-xs font-mono text-zinc-400 flex items-center justify-center lg:justify-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Official Cue Sheets &amp; ISRC Delivered</span>
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
