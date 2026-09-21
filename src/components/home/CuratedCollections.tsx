import React from 'react';
import Link from 'next/link';
import { Zap, Film, Headphones, Flame, ArrowUpRight, Music2, Sparkles } from 'lucide-react';

interface CollectionItem {
  title: string;
  subtitle: string;
  genreSlug: string;
  badge: string;
  bpm: string;
  image: string;
  icon: React.ReactNode;
  tags: string[];
}

const COLLECTIONS: CollectionItem[] = [
  {
    title: 'Commercial & High-Tech Pop',
    subtitle: 'Punchy 808s, Prophet synth leads, and modern anthems engineered for SaaS reveals and keynote intros.',
    genreSlug: 'commercial-pop',
    badge: 'HIGH CONVERSION',
    bpm: '120–128 BPM',
    image: '/banners/banner-spark-energy.jpg',
    icon: <Zap className="w-5 h-5 text-crimson-400" />,
    tags: ['SaaS Demos', 'Keynotes', 'Stems Included'],
  },
  {
    title: 'Cinematic Hybrid & Festival Drama',
    subtitle: 'Thunderous hybrid percussion, soaring brass, and atmospheric sub-bass for documentaries and films.',
    genreSlug: 'cinematic-hybrid',
    badge: 'CINEMA GRADE',
    bpm: '90–115 BPM',
    image: '/banners/banner-fireworks-magenta.jpg',
    icon: <Film className="w-5 h-5 text-amber-400" />,
    tags: ['Documentaries', 'Teasers', 'Full Orchestra'],
  },
  {
    title: 'Electronic Club & Synthwave Sync',
    subtitle: 'Pumping sidechain basslines, hypnotic arpeggiators, and crisp drops for brand activations and sports reels.',
    genreSlug: 'commercial-pop',
    badge: 'CLUB ENERGY',
    bpm: '124–132 BPM',
    image: '/banners/banner-dj-producer.jpg',
    icon: <Flame className="w-5 h-5 text-rose-400" />,
    tags: ['Sports Promos', 'TV Commercials', 'WAV Broadcast'],
  },
  {
    title: 'Tech Lo-Fi & Ambient Minimal',
    subtitle: 'Subtle warm analog tape textures, acoustic guitars, and understated beds calibrated for voiceover clarity.',
    genreSlug: 'tech-ambient',
    badge: 'VOICEOVER SAFE',
    bpm: '85–100 BPM',
    image: '/banners/banner-crowd-amber.jpg',
    icon: <Headphones className="w-5 h-5 text-emerald-400" />,
    tags: ['Podcasts', 'Explainer Videos', 'Tape Saturation'],
  },
];

export function CuratedCollections() {
  return (
    <section className="py-20 sm:py-24 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full relative z-10">
      <div className="w-full max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-white/[0.08]">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-crimson-600/15 text-crimson-400 border border-crimson-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-crimson-400 animate-pulse" />
              CURATED MOOD PALETTES
            </span>
            <h2 className="font-syne text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-sm">
              Cinematic Collections for Every Timeline
            </h2>
          </div>
          <Link
            href="/#catalog"
            className="text-sm font-mono text-zinc-400 hover:text-crimson-400 transition-colors inline-flex items-center gap-1.5 font-semibold group"
          >
            <span>View all 6 catalog tracks</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {COLLECTIONS.map((col) => (
            <Link
              key={col.title}
              href={`/genres/${col.genreSlug}`}
              className="group relative rounded-2xl overflow-hidden border border-white/[0.08] bg-obsidian-950 p-6 sm:p-7 flex flex-col justify-between min-h-[320px] transition-all duration-500 hover:border-crimson-500/60 hover:shadow-2xl hover:shadow-crimson-600/20 card-hover shine-sweep"
            >
              {/* Background Image with Dark Cinematic Gradient Overlay */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                  src={col.image}
                  alt={col.title}
                  className="w-full h-full object-cover object-center filter brightness-[0.45] contrast-110 group-hover:scale-105 group-hover:brightness-[0.55] transition-all duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-obsidian-950/65 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-obsidian-950/80 via-transparent to-transparent" />
              </div>

              {/* Top Row Badges */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-xl border border-white/15 flex items-center justify-center group-hover:border-crimson-500 group-hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all">
                  {col.icon}
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="px-2.5 py-1 rounded-full bg-crimson-600/90 text-white font-bold backdrop-blur-md shadow-md">
                    {col.badge}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-black/60 text-zinc-300 border border-white/15 backdrop-blur-md">
                    {col.bpm}
                  </span>
                </div>
              </div>

              {/* Bottom Content */}
              <div className="relative z-10 pt-16">
                <h3 className="font-syne text-xl sm:text-2xl font-black text-white group-hover:text-crimson-400 transition-colors tracking-tight drop-shadow-sm">
                  {col.title}
                </h3>
                <p className="text-xs text-zinc-300 mt-2 line-clamp-2 leading-relaxed font-jakarta">
                  {col.subtitle}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/10">
                  {col.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[10px] text-zinc-300 px-2 py-0.5 rounded-md bg-black/50 border border-white/10 backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="ml-auto text-xs font-semibold text-crimson-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Explore <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
