'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Film,
  FileCheck2,
  Layers,
  ArrowRight,
  Disc3,
  AudioLines,
  Headphones,
  Flame,
  Zap,
  Radio,
  Play,
  Pause,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAudio } from '../audio/GlobalAudioContext';

interface OverlayOption {
  id: string;
  name: string;
  src: string;
  category: string;
  icon: React.ReactNode;
  tagline: string;
  projectCredit: string;
  bpmKey: string;
}

const OVERLAYS: OverlayOption[] = [
  {
    id: 'dj',
    name: 'DJ Producer',
    category: 'Electronic & Studio Sync',
    src: '/banners/banner-dj-producer.jpg',
    icon: <Headphones className="w-4 h-4" />,
    tagline: 'Pioneer DJ Console & Hardware Synthesizers',
    projectCredit: 'Aura of Silicon · Sequential Prophet-6 Arp',
    bpmKey: '122 BPM · D Major',
  },
  {
    id: 'festival',
    name: 'Festival Stage',
    category: 'Stadium & Global Anthems',
    src: '/banners/banner-festival-stage.jpg',
    icon: <Sparkles className="w-4 h-4" />,
    tagline: 'Monumental Live Stage & Crowd Energy',
    projectCredit: 'Titan Stadium · Electric Guitar & Synth Anthem',
    bpmKey: '130 BPM · E Minor',
  },
  {
    id: 'fireworks',
    name: 'Crimson Fireworks',
    category: 'Festival & Cinematic Drama',
    src: '/banners/banner-fireworks-magenta.jpg',
    icon: <Flame className="w-4 h-4" />,
    tagline: 'High-Impact Festival Night Atmosphere',
    projectCredit: 'Ascent of Kings · Hybrid Brass & Sub-Bass',
    bpmKey: '96 BPM · C Minor',
  },
  {
    id: 'sparks',
    name: 'Sparks Energy',
    category: 'High-Velocity Commercials',
    src: '/banners/banner-spark-energy.jpg',
    icon: <Zap className="w-4 h-4" />,
    tagline: 'Cinematic Visual Explosion & Anthems',
    projectCredit: 'Apex Drive · Punchy 808s & Guitar Hook',
    bpmKey: '128 BPM · A Minor',
  },
  {
    id: 'energy',
    name: 'Crimson Pulse',
    category: 'Cyber Laser & TV Broadcast',
    src: '/banners/banner-stage-lights.jpg',
    icon: <Radio className="w-4 h-4" />,
    tagline: 'Cyber Stage Lasers & Stadium Lighting',
    projectCredit: 'Silicon Sunset · Lo-Fi Tape Waves & Chords',
    bpmKey: '86 BPM · F Major',
  },
];

export function HeroSection() {
  const [activeOverlay, setActiveOverlay] = useState<OverlayOption>(OVERLAYS[0]);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const { currentTrack, isPlaying, togglePlay } = useAudio();

  return (
    <section className="relative overflow-hidden pt-24 pb-20 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
      {/* ─── FLUID AMBIENT IMAGE BACKDROP BLEED (TONED OUT FOR NATURAL BREATHING & LUMINANCE) ─── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Active Banner Image with Fade Transition */}
        <img
          key={activeOverlay.id}
          src={activeOverlay.src}
          alt={activeOverlay.name}
          className="w-full h-full object-cover object-center filter brightness-[0.62] contrast-105 saturate-110 transition-all duration-1000 scale-105 animate-fade-in"
        />

        {/* Ambient Gradient Bleed: Softened masks so the image breathes cleanly while text stays razor-sharp */}
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian-950/75 via-obsidian-950/40 to-obsidian-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian-950/80 via-transparent to-obsidian-950/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.12)_0%,transparent_75%)]" />
      </div>

      {/* Floating Ambient Glowing Energy Orbs - Softened & toned out */}
      <div className="absolute top-20 right-1/4 w-[500px] h-[500px] rounded-full bg-crimson-600/[0.08] blur-[180px] pointer-events-none -z-0" />
      <div className="absolute bottom-10 left-10 w-[600px] h-[600px] rounded-full bg-crimson-900/[0.08] blur-[200px] pointer-events-none -z-0" />

      <div className="w-full max-w-[1600px] mx-auto relative z-10">
        
        {/* ─── TOP HEADLINE AREA (BOUNDLESS, EXPANSIVE) ─── */}
        <div className="text-center max-w-4xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold bg-crimson-950/70 text-crimson-300 border border-crimson-600/40 mb-6 shadow-xl backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-crimson-500 animate-ping shadow-[0_0_8px_#EF4444]" />
            <Disc3 className="w-3.5 h-3.5 text-crimson-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>DIRECT SYNCHRONIZATION CATALOG // 24-BIT WAV</span>
          </div>

          <h1 className="font-syne text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.02] drop-shadow-2xl">
            Commercial Music
            <br />
            <span className="text-crimson-gradient text-glow-crimson">
              Built for Professionals.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg lg:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed font-jakarta">
            100% pre-cleared sync licenses with isolated stems, broadcast cutdowns (:60, :30), and guaranteed cue-sheet protection. No recurring subscriptions.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link
              href="/#catalog"
              className="btn-crimson text-white font-extrabold text-sm sm:text-base px-8 py-4 rounded-full flex items-center gap-2.5 shadow-2xl shadow-crimson-600/40 border border-white/20 hover:scale-105 transition-all duration-300 shine-sweep"
            >
              <AudioLines className="w-5 h-5" />
              <span>Explore Catalog</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="text-sm sm:text-base font-semibold px-8 py-4 rounded-full border border-white/15 bg-white/5 backdrop-blur-xl text-zinc-100 hover:border-crimson-500/60 hover:text-white transition-all shadow-xl hover:bg-white/10"
            >
              Perpetual Tiers: $10 / $20 / $40
            </Link>
          </div>
        </div>

        {/* ─── SOUNDSTRIPE-INSPIRED INTERACTIVE OVERLAY BANNER SHOWCASE ─── */}
        {/* A seamless, borderless interactive showcase that smoothly bleeds into the dark background */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-4">
          
          {/* LEFT: Cinematic Hero Video/Banner Canvas (8 cols) */}
          <div className="lg:col-span-8 relative rounded-2xl sm:rounded-3xl overflow-hidden min-h-[380px] sm:min-h-[460px] flex flex-col justify-between p-6 sm:p-10 shadow-2xl group">
            {/* Dynamic Banner Image with Cinematic Overlay */}
            <div className="absolute inset-0 z-0">
              <img
                key={activeOverlay.id}
                src={activeOverlay.src}
                alt={activeOverlay.name}
                className="w-full h-full object-cover object-center filter brightness-[0.7] contrast-115 group-hover:scale-105 transition-all duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-obsidian-950/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-obsidian-950/80 via-transparent to-transparent" />
            </div>

            {/* Top Bar of Active Showcase */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-black/60 text-white border border-white/20 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-crimson-500 animate-ping" />
                <span>OVERLAY ATMOSPHERE: {activeOverlay.name.toUpperCase()}</span>
              </div>
              <span className="text-xs font-mono text-zinc-300 bg-black/60 px-3 py-1 rounded-full border border-white/15 backdrop-blur-md">
                {activeOverlay.bpmKey}
              </span>
            </div>

            {/* Center Play Button Overlay */}
            <div className="relative z-10 self-center my-auto">
              <button
                onClick={() => setIsPlayingPreview(!isPlayingPreview)}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full btn-crimson text-white flex items-center justify-center shadow-2xl shadow-crimson-600/60 hover:scale-110 transition-transform group/play border-2 border-white/30"
                aria-label={isPlayingPreview ? 'Pause Audio Preview' : 'Play Audio Preview'}
              >
                {isPlayingPreview ? (
                  <Pause className="w-7 h-7 fill-current animate-pulse" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-1" />
                )}
              </button>
            </div>

            {/* Bottom Audio Info Bar & Waveform Scan */}
            <div className="relative z-10 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-3">
                <div>
                  <span className="text-xs font-mono text-crimson-400 font-bold uppercase tracking-wider block">
                    Featured Commercial Synchronization Track
                  </span>
                  <h3 className="font-syne text-xl sm:text-2xl font-black text-white drop-shadow-md">
                    {activeOverlay.projectCredit}
                  </h3>
                </div>
                <Link
                  href="/#catalog"
                  className="text-xs font-mono text-zinc-300 hover:text-white bg-black/60 px-3.5 py-1.5 rounded-xl border border-white/15 backdrop-blur-md inline-flex items-center gap-1.5 self-start sm:self-auto hover:border-crimson-500 transition-colors"
                >
                  <span>License from $10</span>
                  <ArrowRight className="w-3.5 h-3.5 text-crimson-400" />
                </Link>
              </div>

              {/* Dynamic Waveform Bar */}
              <div className={`h-8 flex items-center gap-1 px-3 bg-black/60 rounded-xl border border-white/10 backdrop-blur-md overflow-hidden ${isPlayingPreview ? 'laser-scanner' : ''}`}>
                {Array.from({ length: 48 }).map((_, idx) => {
                  const h = 20 + (((idx * 13 + 7) % 75));
                  return (
                    <div
                      key={idx}
                      className={`flex-1 rounded-full transition-all ${
                        isPlayingPreview
                          ? 'bg-gradient-to-t from-crimson-600 to-crimson-400 bar-playing shadow-[0_0_4px_rgba(220,38,38,0.8)]'
                          : 'bg-zinc-600/60'
                      }`}
                      style={{
                        height: `${h}%`,
                        animationDelay: isPlayingPreview ? `${(idx % 12) * 0.05}s` : '0s',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Atmosphere Cases List (4 cols) — Soundstripe Interactive Style */}
          <div className="lg:col-span-4 flex flex-col justify-center gap-3">
            <div className="px-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
                Select Overlay Mood:
              </span>
            </div>

            {OVERLAYS.map((overlay) => {
              const isActive = activeOverlay.id === overlay.id;

              return (
                <button
                  key={overlay.id}
                  onClick={() => setActiveOverlay(overlay)}
                  className={`text-left p-3 sm:p-3.5 rounded-2xl transition-all duration-300 flex items-center justify-between gap-3 group border ${
                    isActive
                      ? 'bg-obsidian-900/95 border-crimson-500/80 text-white shadow-xl shadow-crimson-600/20 scale-[1.02] ring-1 ring-crimson-500/60'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 hover:text-white border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Visual Banner Thumbnail */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border border-white/15 shadow-md group-hover:border-crimson-500/50 transition-colors">
                      <img
                        src={overlay.src}
                        alt={overlay.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter brightness-90"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent ${isActive ? 'ring-2 ring-crimson-500' : ''}`} />
                      <div className={`absolute bottom-1 right-1 p-0.5 rounded-full ${isActive ? 'text-crimson-400' : 'text-zinc-300'}`}>
                        {overlay.icon}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-syne text-sm sm:text-base font-bold truncate ${isActive ? 'text-white' : 'text-zinc-200'}`}>
                          {overlay.name}
                        </span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-crimson-500 animate-ping shrink-0" />
                        )}
                      </div>
                      <div
                        className={`text-xs truncate font-jakarta mt-0.5 ${
                          isActive ? 'text-crimson-300 font-medium' : 'text-zinc-400'
                        }`}
                      >
                        {overlay.tagline}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pr-1">
                    {isActive ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-crimson-600 text-white shadow-md shadow-crimson-600/40">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
