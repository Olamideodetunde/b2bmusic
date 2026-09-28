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
  const { currentTrack, isPlaying, playTrack, togglePlay, seek, currentTime, duration } = useAudio();
  const isCurrent = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrent && isPlaying;

  const effectiveDuration = isCurrent && duration > 0 ? duration : track.durationSeconds;
  const progressPercent = isCurrent && effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isCurrent) {
      playTrack(track);
    } else {
      togglePlay();
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    if (!isCurrent) {
      playTrack(track);
    }
    seek(ratio * effectiveDuration);
  };

  return (
    <div
      className={`group w-full py-3.5 px-3 sm:px-5 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 relative ${
        isCurrent
          ? 'bg-crimson-950/20 border-crimson-500/40 shadow-xl shadow-crimson-950/30 ring-1 ring-crimson-500/20'
          : 'bg-white/[0.015] hover:bg-white/[0.04] border-white/[0.06] hover:border-white/15'
      }`}
    >
      {/* Active track subtle left crimson accent glow line */}
      {isCurrent && (
        <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-crimson-400 via-crimson-500 to-crimson-700 shadow-[0_0_12px_#EF4444]" />
      )}

      {/* ─── Left: Circular Play Trigger + Thumbnail + Title/Artist ─── */}
      <div className="flex items-center gap-3.5 min-w-0 md:w-80 lg:w-96 shrink-0">
        {/* PremiumBeat-Style Circular Play Button */}
        <button
          onClick={handlePlay}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
            isCurrentlyPlaying
              ? 'bg-crimson-600 border-crimson-400 text-white shadow-xl shadow-crimson-600/50 scale-105'
              : 'border-white/15 bg-white/[0.05] text-white hover:border-crimson-500 hover:bg-crimson-600/20 group-hover:border-white/30'
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
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 hidden sm:block shadow-md">
            <img
              src={track.coverImageUrl}
              alt={track.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </div>
        )}

        {/* Title & Artist/Genre Line */}
        <div className="min-w-0 flex-1">
          <Link
            href={`/tracks/${track.slug}`}
            className="font-syne text-base font-bold text-white hover:text-crimson-400 transition-colors truncate block tracking-tight"
          >
            {track.title}
          </Link>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-jakarta mt-0.5 truncate">
            <span className="truncate">by {track.syncMeta?.composer || 'B2B Music Sync'}</span>
            <span className="text-zinc-600">•</span>
            <Link
              href={`/genres/${track.genre.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-zinc-300 hover:text-crimson-400 transition-colors font-medium shrink-0"
            >
              {track.genre}
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Middle: Interactive Expansive Waveform with Click-to-Scrub ─── */}
      <div
        onClick={handleWaveformClick}
        title="Click to audition &amp; scrub"
        className={`hidden md:flex flex-1 max-w-xl xl:max-w-2xl 2xl:max-w-3xl mx-4 items-center gap-[2.5px] h-10 px-2.5 rounded-xl cursor-pointer select-none overflow-hidden transition-colors hover:bg-white/[0.03] ${
          isCurrentlyPlaying ? 'laser-scanner' : ''
        }`}
      >
        {Array.from({ length: 56 }).map((_, i) => {
          const barProgress = (i / 56) * 100;
          const isPlayed = isCurrent && progressPercent >= barProgress;
          const barHeight = 20 + (((i * 19 + track.id * 17) % 75));

          return (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-100 ${
                isPlayed
                  ? 'bg-gradient-to-t from-crimson-600 via-crimson-500 to-crimson-400 shadow-[0_0_5px_rgba(220,38,38,0.7)]'
                  : isCurrentlyPlaying
                    ? 'bg-zinc-700/60 hover:bg-zinc-500'
                    : 'bg-zinc-700/40 hover:bg-zinc-500'
              } ${isCurrentlyPlaying && isPlayed && i % 3 === 0 ? 'bar-playing' : ''}`}
              style={{
                height: `${barHeight}%`,
                animationDelay: isCurrentlyPlaying ? `${(i % 14) * 0.05}s` : '0s',
              }}
            />
          );
        })}
      </div>

      {/* ─── Right: DAW Tags, Price & PremiumBeat-Style Download Button ─── */}
      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0">
        {/* Technical Badges */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5">{track.bpm} BPM</span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5">{track.musicalKey}</span>
          <span className="text-zinc-500 font-semibold">{formatDuration(track.durationSeconds)}</span>
        </div>

        {/* PremiumBeat-Style Pill Download / License CTA */}
        <Link
          href={`/tracks/${track.slug}`}
          className="inline-flex flex-col items-center justify-center px-4 sm:px-5 py-2 rounded-full border border-white/20 bg-white/[0.04] hover:bg-crimson-600 hover:border-crimson-500 text-white transition-all shadow-md group/btn shrink-0"
        >
          <div className="flex items-center gap-1.5 font-syne text-xs font-black tracking-wider uppercase">
            <span>LICENSE {formatPrice(track.standardPriceCents)}</span>
          </div>
          <div className="flex items-center gap-0.5 text-[9px] font-mono text-zinc-400 group-hover/btn:text-white/90">
            <span>Includes Stems</span>
            <ChevronDown className="w-2.5 h-2.5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
