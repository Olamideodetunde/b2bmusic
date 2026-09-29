'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Pause, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Track } from '@/lib/db/types';
import { useAudio } from '../audio/GlobalAudioContext';
import { Waveform } from '../audio/Waveform';
import { Container, PrimaryButton, GhostButton } from './primitives';
import { cn, formatDuration, parseMusicalKey } from '@/lib/utils';

// Graded to monochrome so mixed-colour concert photography reads as one set.
const SLIDES = [
  { src: '/banners/banner-monochrome-club.jpg', alt: 'Crowd under stage lights' },
  { src: '/banners/banner-stage-lights.jpg', alt: 'Festival stage and audience' },
  { src: '/banners/banner-dj-producer.jpg', alt: 'Producer performing at a DJ console' },
];
const SLIDE_MS = 7000;

const STATS = [
  { value: '100%', label: 'One-stop cleared' },
  { value: '24/48', label: 'Bit / kHz WAV masters' },
  { value: '6', label: 'Alt-mixes & cutdowns per track' },
  { value: '$10', label: 'Perpetual license from' },
];

function SessionCard({ tracks }: { tracks: Track[] }) {
  const { currentTrack, isPlaying, playTrack, togglePlay, seek, currentTime, duration, setQueue } = useAudio();

  const handlePlay = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }
    setQueue(tracks);
    playTrack(track);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-obsidian-950/70 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 h-12 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className={cn('w-1.5 h-1.5 rounded-full', isPlaying ? 'bg-crimson-500' : 'bg-obsidian-500')} />
          <span className="label-xs !text-zinc-300">Now auditioning</span>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">Brief · Q4 Product Launch</span>
      </div>

      <ul>
        {tracks.map((track, i) => {
          const active = currentTrack?.id === track.id;
          const dur = active && duration > 0 ? duration : track.durationSeconds;
          const progress = active && dur > 0 ? Math.min(1, currentTime / dur) : 0;
          const key = parseMusicalKey(track.musicalKey);
          return (
            <li
              key={track.id}
              className={cn(
                'group grid grid-cols-[36px_minmax(0,1fr)_auto] sm:grid-cols-[36px_minmax(0,1fr)_112px_auto] items-center gap-4 px-5 py-3 border-b border-white/[0.04] last:border-0 transition-colors',
                active ? 'bg-crimson-600/[0.08]' : 'hover:bg-white/[0.03]',
              )}
            >
              <button
                onClick={() => handlePlay(track)}
                className="relative w-9 h-9 rounded-md overflow-hidden shrink-0"
                aria-label={active && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
              >
                {track.coverImageUrl && <img src={track.coverImageUrl} alt="" className="w-full h-full object-cover" />}
                <span
                  className={cn(
                    'absolute inset-0 flex items-center justify-center bg-black/55 text-white transition-opacity',
                    active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                  )}
                >
                  {active && isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-px" />}
                </span>
              </button>

              <div className="min-w-0">
                <Link
                  href={`/tracks/${track.slug}`}
                  className={cn('block text-sm font-semibold tracking-tight truncate', active ? 'text-crimson-300' : 'text-white hover:text-crimson-300')}
                >
                  {track.title}
                </Link>
                <div className="text-[11px] font-mono tabular-nums text-zinc-500 truncate mt-0.5">
                  {track.genre} · {track.bpm} BPM · {key.camelot ?? key.short}
                </div>
              </div>

              <Waveform
                seed={track.id}
                progress={progress}
                durationSeconds={dur}
                isActive={active}
                onSeek={(r) => {
                  if (!active) handlePlay(track);
                  seek(r * dur);
                }}
                bars={36}
                className="hidden sm:flex h-6"
              />

              <span className="text-xs font-mono tabular-nums text-zinc-500 w-9 text-right">
                {formatDuration(track.durationSeconds)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between px-5 h-12 border-t border-white/[0.06] text-xs">
        <span className="inline-flex items-center gap-1.5 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          All tracks one-stop cleared
        </span>
        <Link href="/#catalog" className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors">
          Full catalog <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function HeroSection({ tracks }: { tracks: Track[] }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setSlide(s => (s + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [slide]);

  return (
    <section className="relative -mt-16 min-h-[100svh] flex flex-col overflow-hidden">
      {/* ─── Backdrop: slow crossfade + Ken Burns ─── */}
      <div className="absolute inset-0" aria-hidden>
        {SLIDES.map((s, i) => (
          <img
            key={s.src}
            src={s.src}
            alt=""
            className={cn(
              'absolute inset-0 w-full h-full object-cover grayscale contrast-[1.15] brightness-[0.58] transition-opacity duration-[2000ms] ease-out',
              i === slide ? 'opacity-100 motion-safe:animate-kenburns' : 'opacity-0',
            )}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian-950 via-obsidian-950/70 to-obsidian-950/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-transparent to-obsidian-950/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_30%,rgba(220,38,38,0.14),transparent_55%)]" />
      </div>

      <Container className="relative flex-1 flex flex-col pt-28 lg:pt-32 pb-8">
        <div className="flex-1 grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-14 lg:gap-16 items-center">
          {/* ─── Copy ─── */}
          <div>
            <div className="enter-up flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400">
              <span className="w-6 h-px bg-crimson-500" />
              Direct sync catalog
            </div>

            {/* Three fixed lines, sized per breakpoint so the longest ("music, cleared") never wraps */}
            <h1 className="mt-7 text-[2.5rem] sm:text-6xl lg:text-[3.5rem] xl:text-[4.75rem] font-bold tracking-[-0.035em] leading-[0.98] whitespace-nowrap">
              <span className="line-mask"><span style={{ '--line-delay': '80ms' } as React.CSSProperties}>Commercial</span></span>
              <span className="line-mask">
                <span style={{ '--line-delay': '200ms' } as React.CSSProperties}>
                  music, <span className="text-obsidian-300">cleared</span>
                </span>
              </span>
              <span className="line-mask"><span className="text-obsidian-300" style={{ '--line-delay': '320ms' } as React.CSSProperties}>for every cut.</span></span>
            </h1>

            <p className="enter-up mt-8 max-w-lg text-base sm:text-lg text-zinc-300 leading-relaxed" style={{ '--enter-delay': '450ms' } as React.CSSProperties}>
              Pre-cleared master recordings with isolated stems, broadcast cutdowns and cue-sheet metadata —
              licensed per track, with no subscription.
            </p>

            <div className="enter-up mt-10 flex flex-wrap items-center gap-3" style={{ '--enter-delay': '560ms' } as React.CSSProperties}>
              <PrimaryButton href="/#catalog">Explore the catalog</PrimaryButton>
              <GhostButton href="/pricing">View licensing</GhostButton>
            </div>
          </div>

          {/* ─── Product: live session card ─── */}
          <div className="enter-up hidden md:block" style={{ '--enter-delay': '650ms' } as React.CSSProperties}>
            <SessionCard tracks={tracks.slice(0, 4)} />
          </div>
        </div>

        {/* ─── Stats + slide indicator ─── */}
        <div
          className="enter-up mt-12 pt-6 border-t border-white/[0.08] flex flex-col lg:flex-row lg:items-end justify-between gap-8"
          style={{ '--enter-delay': '800ms' } as React.CSSProperties}
        >
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-10 gap-y-5">
            {STATS.map(s => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-2xl font-mono font-medium tabular-nums text-white">{s.value}</dd>
                <dd className="text-xs text-zinc-500 mt-1">{s.label}</dd>
              </div>
            ))}
          </dl>

          <div className="flex items-center gap-2" role="tablist" aria-label="Background image">
            {SLIDES.map((s, i) => (
              <button
                key={s.src}
                role="tab"
                aria-selected={i === slide}
                aria-label={s.alt}
                onClick={() => setSlide(i)}
                className="relative w-10 h-5 flex items-center"
              >
                <span className="block w-full h-px bg-white/20 overflow-hidden">
                  <span
                    key={i === slide ? `active-${slide}` : 'idle'}
                    className={cn(
                      'block h-full bg-white origin-left',
                      i === slide ? 'animate-progress' : 'scale-x-0',
                    )}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
