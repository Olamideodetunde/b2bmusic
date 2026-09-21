import React from 'react';
import Link from 'next/link';
import { Award, ArrowRight, ShieldCheck } from 'lucide-react';

export function AgencyScaleBanner() {
  return (
    <section className="w-full relative z-10 py-20 sm:py-24 border-t border-white/[0.08] bg-obsidian-950/80 overflow-hidden">
      {/* Background Image with Cinematic Dark Gradient Vignette */}
      <div className="absolute inset-0 z-0">
        <img
          src="/banners/banner-crowd-amber.jpg"
          alt="Crowd atmosphere"
          className="w-full h-full object-cover object-center filter brightness-[0.2] contrast-125 saturate-110"
        />
        {/* Gradients to merge seamlessly into the obsidian canvas */}
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian-950 via-obsidian-950/85 to-obsidian-950/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-transparent to-obsidian-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_right,rgba(220,38,38,0.25),transparent_70%)]" />
      </div>

      {/* Content */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12">
          
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 mb-4 backdrop-blur-md">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>TRANSPARENT COMMERCIAL PRICING</span>
            </div>

            <h3 className="font-syne text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.08] drop-shadow-sm">
              One Flat Fee. Perpetual Sync.
              <br />
              <span className="text-crimson-gradient text-glow-crimson">No Monthly Subscription Traps.</span>
            </h3>

            <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl font-jakarta">
              Pay once per track and keep your sync license forever. Simple transparent tiers at <strong className="text-white font-mono">$10</strong>, <strong className="text-crimson-400 font-mono">$20</strong>, and <strong className="text-white font-mono">$40</strong> tailored for independent creators, production houses, and global brands.
            </p>

            {/* Flat Tiers Row */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8 max-w-lg">
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center backdrop-blur-md hover:border-white/20 transition-colors">
                <span className="font-mono text-2xl sm:text-3xl font-black text-white block">$10</span>
                <span className="text-[10px] sm:text-xs font-mono text-zinc-400 uppercase font-semibold mt-1 block">Standard Web</span>
              </div>
              <div className="p-4 sm:p-5 rounded-2xl bg-crimson-950/60 border-2 border-crimson-500 text-center shadow-lg shadow-crimson-600/20 backdrop-blur-md">
                <span className="font-mono text-2xl sm:text-3xl font-black text-crimson-400 block">$20</span>
                <span className="text-[10px] sm:text-xs font-mono text-crimson-200 uppercase font-bold mt-1 block">Commercial Ads</span>
              </div>
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center backdrop-blur-md hover:border-white/20 transition-colors">
                <span className="font-mono text-2xl sm:text-3xl font-black text-white block">$40</span>
                <span className="text-[10px] sm:text-xs font-mono text-zinc-400 uppercase font-semibold mt-1 block">Broadcast TV</span>
              </div>
            </div>
          </div>

          {/* CTA & Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3.5 shrink-0">
            <Link
              href="/pricing"
              className="btn-crimson text-white font-extrabold text-sm px-8 py-4 rounded-xl flex items-center justify-center gap-2.5 shadow-2xl shadow-crimson-600/30 hover:scale-105 transition-all"
            >
              <span>View All Licensing Tiers</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/#catalog"
              className="px-8 py-4 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white text-center transition-colors backdrop-blur-md"
            >
              Browse 6 Production Tracks
            </Link>
            <div className="pt-2 text-center lg:text-left">
              <span className="text-xs font-mono text-zinc-400 flex items-center justify-center lg:justify-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Monetization Whitelist Guaranteed</span>
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
