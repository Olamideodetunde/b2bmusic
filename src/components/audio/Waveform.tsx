'use client';

import React, { useMemo, useState } from 'react';
import { cn, formatDuration } from '@/lib/utils';

interface WaveformProps {
  seed: number;
  /** 0–1 playback position; 0 when this waveform isn't the active track. */
  progress: number;
  durationSeconds: number;
  isActive: boolean;
  onSeek: (ratio: number) => void;
  bars?: number;
  className?: string;
}

/** Deterministic pseudo-amplitude envelope so each track has a stable shape. */
function buildEnvelope(seed: number, bars: number): number[] {
  return Array.from({ length: bars }, (_, i) => {
    const t = i / bars;
    const body = Math.sin(t * Math.PI) * 38 + 30;            // swell toward the middle
    const texture = ((i * 19 + seed * 17) % 29) + Math.sin(i * 0.7 + seed) * 8;
    // Rounded so server (Node) and browser float math produce identical markup.
    return Math.round(Math.max(14, Math.min(100, body + texture)));
  });
}

export function Waveform({
  seed,
  progress,
  durationSeconds,
  isActive,
  onSeek,
  bars = 72,
  className,
}: WaveformProps) {
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const envelope = useMemo(() => buildEnvelope(seed, bars), [seed, bars]);

  const ratioFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  return (
    <div
      role="slider"
      aria-label="Scrub waveform"
      aria-valuemin={0}
      aria-valuemax={Math.round(durationSeconds)}
      aria-valuenow={Math.round(progress * durationSeconds)}
      tabIndex={-1}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSeek(ratioFromEvent(e));
      }}
      onMouseMove={(e) => setHoverRatio(ratioFromEvent(e))}
      onMouseLeave={() => setHoverRatio(null)}
      className={cn('relative flex items-center gap-px h-8 cursor-pointer select-none group/wave', className)}
    >
      {envelope.map((h, i) => {
        const played = isActive && i / bars < progress;
        const previewed = hoverRatio !== null && i / bars < hoverRatio;
        return (
          <div
            key={i}
            className={cn(
              'flex-1 min-w-px rounded-[1px] transition-colors duration-75',
              played
                ? 'bg-brand-500'
                : previewed
                  ? 'bg-navy-400'
                  : isActive
                    ? 'bg-navy-500'
                    : 'bg-navy-600 group-hover/wave:bg-navy-500',
            )}
            style={{ height: `${h}%` }}
          />
        );
      })}

      {/* Playhead */}
      {isActive && (
        <div
          className="absolute inset-y-0 w-px bg-white pointer-events-none"
          style={{ left: `${progress * 100}%` }}
        />
      )}

      {/* Hover scrubhead + timestamp */}
      {hoverRatio !== null && (
        <>
          <div
            className="absolute inset-y-[-2px] w-px bg-brand-300/80 pointer-events-none"
            style={{ left: `${hoverRatio * 100}%` }}
          />
          <div
            className="absolute -top-5 -translate-x-1/2 px-1 py-px rounded-sm bg-navy-800 border border-white/10 text-[10px] leading-3 font-mono tabular-nums text-slate-100 pointer-events-none whitespace-nowrap z-10"
            style={{ left: `${Math.min(94, Math.max(6, hoverRatio * 100))}%` }}
          >
            {formatDuration(Math.floor(hoverRatio * durationSeconds))}
          </div>
        </>
      )}
    </div>
  );
}
