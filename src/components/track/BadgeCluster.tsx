import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Activity, KeyRound, Music, Tag } from 'lucide-react';

interface BadgeClusterProps {
  bpm: number;
  musicalKey: string;
  genre: string;
  moods?: string[];
}

export function BadgeCluster({ bpm, musicalKey, genre, moods = [] }: BadgeClusterProps) {
  const genreSlug = genre.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-wrap items-center gap-2 my-4">
      {/* Genre Badge */}
      <Link
        href={`/genres/${genreSlug}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-crimson-600/15 text-crimson-300 border border-crimson-500/30 hover:bg-crimson-600/25 transition-colors shadow-sm"
      >
        <Music className="w-3 h-3 text-crimson-400" />
        {genre}
      </Link>

      {/* BPM Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-obsidian-900/80 text-zinc-300 border border-white/10 shadow-sm backdrop-blur-md">
        <Activity className="w-3 h-3 text-emerald-400" />
        <span className="tracking-wider font-semibold">{bpm} BPM</span>
      </div>

      {/* Key Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-obsidian-900/80 text-zinc-300 border border-white/10 shadow-sm backdrop-blur-md">
        <KeyRound className="w-3 h-3 text-amber-400" />
        <span className="tracking-wider uppercase font-semibold">{musicalKey}</span>
      </div>

      {/* Mood Tags */}
      {(moods || []).map((mood, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-zinc-400 bg-obsidian-900/60 border border-white/5"
        >
          <Tag className="w-2.5 h-2.5 text-zinc-500" />
          {mood}
        </span>
      ))}

      {/* Rights badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-auto shadow-sm">
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span>100% Commercial Cleared</span>
      </div>
    </div>
  );
}
