'use client';

import React from 'react';
import { Track } from '@/lib/db/types';
import { useAudio } from '../audio/GlobalAudioContext';
import { Play, Pause, ChevronDown, Check, ShieldCheck, Layers, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { formatDuration, formatPrice } from '@/lib/utils';

interface TrackCardProps {
  track: Track;
}

export function TrackCard({ track }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudio();
  const isCurrent = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrent && isPlaying;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isCurrent) {
      playTrack(track);
    } else {
      togglePlay();
    }
  };

  return (
    <div
      className={`group w-full py-4 px-2 sm:px-4 border-b border-white/[0.08] hover:bg-white/[0.025] transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 relative ${
        isCurrent ? 'bg-white/[0.035]' : ''
      }`}
    >
      {/* Active track subtle left crimson accent glow line */}
      {isCurrent && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-crimson-400 via-crimson-600 to-crimson-800 shadow-[0_0_12px_#EF4444]" />
      )}

      {/* ─── Left: Circular Play Trigger + Thumbnail + Title/Artist ─── */}
      <div className="flex items-center gap-4 min-w-0 md:w-80 lg:w-96 shrink-0">
        {/* PremiumBeat-Style Circular Play Button */}
        <button
          onClick={handlePlay}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 border transition-all ${
            isCurrentlyPlaying
              ? 'bg-crimson-600 border-crimson-400 text-white shadow-lg shadow-crimson-600/50 scale-105'
              : 'border-white/20 bg-white/[0.04] text-white hover:border-crimson-500 hover:bg-crimson-600/20 group-hover:border-white/40'
          }`}
          aria-label={isCurrentlyPlaying ? 'Pause track' : 'Play track'}
        >
          {isCurrentlyPlaying ? (
            <Pause className="w-5 h-5 fill-current animate-pulse" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Cover thumbnail */}
        {track.coverImageUrl && (
          <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-white/10 hidden sm:block">
            <img
              src={track.coverImageUrl}
              alt={track.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}

        {/* Title & Artist/Genre Line */}
        <div className="min-w-0 flex-1">
          <Link
            href={`/tracks/${track.slug}`}
            className="font-syne text-base sm:text-lg font-bold text-white hover:text-crimson-400 transition-colors truncate block tracking-tight"
          >
            {track.title}
          </Link>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-jakarta mt-0.5 truncate">
            <span>by {track.syncMeta?.composer || 'B2B Music Sync'}</span>
            <span className="text-zinc-600">•</span>
            <Link
              href={`/genres/${track.genre.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-zinc-300 hover:text-crimson-400 transition-colors"
            >
              {track.genre}
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Middle: Expansive Boundless Waveform on Dark Background ─── */}
      <div className={`hidden md:flex flex-1 max-w-xl xl:max-w-2xl 2xl:max-w-3xl mx-4 items-center gap-[2px] h-10 px-2 select-none overflow-hidden ${
        isCurrentlyPlaying ? 'laser-scanner' : ''
      }`}>
        {Array.from({ length: 56 }).map((_, i) => {
          const barHeight = 18 + (((i * 19 + track.id * 17) % 78));
          return (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-150 ${
                isCurrentlyPlaying
                  ? 'bg-gradient-to-t from-crimson-600 via-crimson-500 to-crimson-300 bar-playing shadow-[0_0_4px_rgba(220,38,38,0.8)]'
                  : 'bg-zinc-700/60 hover:bg-zinc-500'
              }`}
              style={{
                height: `${barHeight}%`,
                animationDelay: isCurrentlyPlaying ? `${(i % 14) * 0.05}s` : '0s',
              }}
            />
          );
        })}
      </div>

      {/* ─── Right: DAW Tags, Price & PremiumBeat-Style Download Button ─── */}
      <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-2 md:pt-0">
        {/* Technical Badges */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span>{track.bpm} BPM</span>
          <span className="text-zinc-700">•</span>
          <span>{track.musicalKey}</span>
          <span className="text-zinc-700">•</span>
          <span>{formatDuration(track.durationSeconds)}</span>
        </div>

        {/* PremiumBeat-Style Pill Download / License CTA */}
        <Link
          href={`/tracks/${track.slug}`}
          className="inline-flex flex-col items-center justify-center px-5 py-2 rounded-full border border-white/20 bg-white/[0.05] hover:bg-crimson-600 hover:border-crimson-500 text-white transition-all shadow-md group/btn"
        >
          <div className="flex items-center gap-1.5 font-syne text-xs font-black tracking-wider uppercase">
            <span>LICENSE {formatPrice(track.standardPriceCents)}</span>
          </div>
          <div className="flex items-center gap-0.5 text-[9px] font-mono text-zinc-400 group-hover/btn:text-white/80">
            <span>Includes Stems</span>
            <ChevronDown className="w-2.5 h-2.5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
