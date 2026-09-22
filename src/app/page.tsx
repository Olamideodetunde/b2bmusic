import React from 'react';
import { getAllTracks } from '@/lib/db';
import { HeroSection } from '@/components/home/HeroSection';
import { CatalogExplorer } from '@/components/hub/CatalogExplorer';
import { StudioPreviewSuite } from '@/components/home/StudioPreviewSuite';
import { CuratedCollections } from '@/components/home/CuratedCollections';
import { SyncIndemnityBanner } from '@/components/home/SyncIndemnityBanner';
import { AgencyScaleBanner } from '@/components/home/AgencyScaleBanner';
import { GlobalBroadcastBanner } from '@/components/home/GlobalBroadcastBanner';
import Link from 'next/link';
import {
  Mic2,
  Layers,
  Globe,
  AudioLines
} from 'lucide-react';

export const revalidate = 3600;

export default async function HomePage() {
  const tracks = await getAllTracks();

  return (
    <div className="flex flex-col min-h-screen bg-obsidian-950 text-white selection:bg-crimson-600/40 selection:text-white">

      {/* ─── HERO WITH FUTURISTIC IMAGE OVERLAY & ATMOSPHERE CONTROLS ─── */}
      <HeroSection />

      {/* ─── TOP CINEMATIC BANNER ─── */}
      <SyncIndemnityBanner />

      {/* ─── INTERACTIVE STUDIO PREVIEW SUITE (DAW / TIMELINE SYNC) ─── */}
      <section className="w-full py-16 sm:py-20 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 border-b border-white/[0.06]">
        <div className="w-full max-w-[1600px] mx-auto">
          <StudioPreviewSuite />
        </div>
      </section>

      {/* ─── CATALOG EXPLORER ─── */}
      <section id="catalog" className="w-full py-20 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 border-b border-white/[0.06]">
        <div className="w-full max-w-[1600px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-6 border-b border-white/[0.08]">
            <div>
              <span className="text-xs font-mono font-bold text-crimson-500 uppercase tracking-widest flex items-center gap-1.5">
                <AudioLines className="w-3.5 h-3.5" />
                Direct Sync Catalog
              </span>
              <h2 className="font-syne text-3xl sm:text-5xl font-black text-white mt-1 tracking-tight drop-shadow-sm">
                {tracks.length} Master Recordings
              </h2>
            </div>
            <Link href="/pricing" className="text-sm text-zinc-400 hover:text-crimson-400 transition-colors font-mono font-semibold flex items-center gap-1.5 group self-start sm:self-auto">
              <span>Perpetual Licenses from <strong className="text-crimson-400 font-bold">$10</strong></span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
          <CatalogExplorer initialTracks={tracks} />
        </div>
      </section>

      {/* ─── CURATED COLLECTIONS / MOOD PALETTES ─── */}
      <CuratedCollections />

      {/* ─── WORLDWIDE STADIUM & BROADCAST BANNER ─── */}
      <GlobalBroadcastBanner />

      {/* ─── WHY B2B PRODUCTION MUSIC (BOUNDLESS ULTRA-MODERN EDITORIAL) ─── */}
      <section className="py-24 sm:py-28 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 relative overflow-hidden w-full border-t border-white/[0.06]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.08),transparent_70%)] pointer-events-none" />
        
        <div className="w-full max-w-[1600px] mx-auto relative z-10">
          <div className="max-w-3xl mb-16">
            <span className="text-xs font-mono font-bold text-crimson-500 uppercase tracking-widest block mb-2">
              B2B Production Music vs. Generic Stock Libraries
            </span>
            <h3 className="font-syne text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.08] drop-shadow-sm">
              Engineered for Professional Video Workflows.
            </h3>
            <p className="text-base sm:text-lg text-zinc-300 mt-4 leading-relaxed font-jakarta">
              Why high-velocity agency teams, commercial editors, and enterprise brands license directly from our master catalog.
            </p>
          </div>

          {/* Boundless Architectural Columns with Hairline Rule */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                num: '01',
                icon: <Mic2 className="w-5 h-5 text-crimson-400" />,
                title: 'Real Hardware & Acoustic Stems',
                desc: 'No algorithmic generic loops. Master recordings made with Prophet synths, Martin acoustics, and custom tape machines. Clean headroom calibrated for voiceover clarity.',
              },
              {
                num: '02',
                icon: <Layers className="w-5 h-5 text-crimson-400" />,
                title: 'Alt-Mixes & Timeline Edits',
                desc: 'Every track ships with Underscores, Drumless Ambient beds, and :60/:30 broadcast cutdowns so editors never waste billable hours splicing edits manually.',
              },
              {
                num: '03',
                icon: <Globe className="w-5 h-5 text-crimson-400" />,
                title: 'Indemnified Direct Clearance',
                desc: 'Direct worldwide sync agreements with 100% pre-cleared master and publishing rights. Automatic YouTube Content ID whitelisting prevents claims on client channels.',
              },
            ].map((item) => (
              <div
                key={item.num}
                className="pt-8 border-t border-white/15 hover:border-crimson-500 transition-colors duration-500 group"
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="font-mono text-3xl sm:text-4xl font-black text-zinc-500 group-hover:text-crimson-400 transition-colors">
                    {item.num}
                  </span>
                  <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center group-hover:border-crimson-500/50 group-hover:bg-crimson-600/10 transition-colors">
                    {item.icon}
                  </div>
                </div>
                <h4 className="font-syne text-xl sm:text-2xl font-bold text-white mb-3 group-hover:text-crimson-300 transition-colors">
                  {item.title}
                </h4>
                <p className="text-sm text-zinc-300 leading-relaxed font-jakarta">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BOTTOM BANNER — AGENCY SCALE & TRANSPARENT PRICING ─── */}
      <AgencyScaleBanner />

    </div>
  );
}
