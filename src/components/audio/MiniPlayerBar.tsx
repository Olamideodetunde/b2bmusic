'use client';

import React from 'react';
import { useAudio } from './GlobalAudioContext';
import { Play, Pause, X } from 'lucide-react';
import Link from 'next/link';
import { formatDuration } from '@/lib/utils';

export function MiniPlayerBar() {
  const { currentTrack, isPlaying, currentTime, duration, togglePlay, stopTrack } = useAudio();

  if (!currentTrack) return null;

  const effectiveDuration = duration > 0 ? duration : currentTrack.durationSeconds;
  const progressPercent = Math.min(100, (currentTime / effectiveDuration) * 100);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-obsidian-950/85 backdrop-blur-2xl border-t border-white/[0.08] shadow-[0_-12px_40px_rgba(0,0,0,0.8)] transition-all">
      {/* Neon Crimson progress bar at very top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-obsidian-800">
        <div
          className="h-full bg-gradient-to-r from-crimson-500 via-crimson-400 to-rose-400 shadow-[0_0_10px_#EF4444] transition-all duration-200"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 py-3 flex items-center justify-between gap-4">
        {/* Track info */}
        <div className="flex items-center gap-3.5 min-w-0 max-w-[240px] sm:max-w-xs md:max-w-sm">
          {currentTrack.coverImageUrl ? (
            <img
              src={currentTrack.coverImageUrl}
              alt={currentTrack.title}
              className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0 shadow-md"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-obsidian-900 border border-crimson-500/40 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-mono font-bold text-crimson-400">HQ</span>
            </div>
          )}
          <div className="min-w-0">
            <Link
              href={`/tracks/${currentTrack.slug}`}
              className="font-syne text-sm font-bold text-white truncate block hover:text-crimson-400 transition-colors"
            >
              {currentTrack.title}
            </Link>
            <p className="font-mono text-xs text-zinc-400 truncate mt-0.5">
              {currentTrack.genre} · {currentTrack.bpm} BPM · {currentTrack.musicalKey}
            </p>
          </div>
        </div>

        {/* Play Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full btn-crimson text-white flex items-center justify-center shadow-lg shadow-crimson-600/40 hover:scale-105 transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current animate-pulse" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
        </div>

        {/* Time display */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="text-white font-bold">{formatDuration(Math.floor(currentTime))}</span>
          <span className="text-zinc-600">/</span>
          <span>{formatDuration(effectiveDuration)}</span>
        </div>

        {/* Waveform mini visualiser */}
        <div className="hidden md:flex items-center gap-[2.5px] h-7 w-28 lg:w-44 xl:w-64">
          {Array.from({ length: 28 }).map((_, i) => {
            const h = 25 + ((i * 11 + (currentTrack.id * 7)) % 65);
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-150 ${isPlaying ? 'bg-gradient-to-t from-crimson-600 to-crimson-400 bar-playing shadow-[0_0_4px_rgba(220,38,38,0.8)]' : 'bg-obsidian-700'}`}
                style={{ height: `${h}%`, animationDelay: `${(i % 10) * 0.05}s` }}
              />
            );
          })}
        </div>

        {/* License CTA + Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/tracks/${currentTrack.slug}`}
            className="hidden sm:inline-flex text-xs font-bold bg-crimson-600/20 text-crimson-300 hover:bg-crimson-600 hover:text-white border border-crimson-500/30 px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-crimson-950/40"
          >
            License Track
          </Link>
          <button
            onClick={stopTrack}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-obsidian-900 hover:bg-obsidian-800 text-zinc-400 hover:text-white border border-white/10 transition-colors"
            aria-label="Close player"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
