'use client';

import React from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
  Bookmark,
  BookmarkCheck,
  PackageOpen,
  X,
  AudioLines,
} from 'lucide-react';
import { useAudio, StemBus, STEM_BUS_CATEGORIES } from './GlobalAudioContext';
import { Waveform } from './Waveform';
import { useWorkspace, DOWNLOAD_FORMATS } from '@/components/workspace/WorkspaceContext';
import { cn, formatDuration, rightsLabel } from '@/lib/utils';
import { CoverImage } from '@/components/ui/CoverImage';

const STEM_BUSES: StemBus[] = ['Master', 'Drums', 'Bass', 'Melody', 'Other'];

const iconBtn =
  'inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-30 disabled:pointer-events-none';

/**
 * Persistent global audio dock. Always mounted so the layout never reflows;
 * renders an idle state until a track is auditioned.
 */
export function MiniPlayerBar() {
  const {
    currentTrack,
    activeMixName,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    stopTrack,
    seek,
    volume,
    setVolume,
    isLooping,
    toggleLoop,
    queue,
    playNext,
    playPrev,
    mutedStems,
    soloStem,
    toggleStemMute,
    toggleStemSolo,
  } = useAudio();
  const { isInProject, toggleProject, openStems, downloadFormat, setDownloadFormat } = useWorkspace();

  const effectiveDuration = currentTrack ? (duration > 0 ? duration : currentTrack.durationSeconds) : 0;
  const progress = effectiveDuration > 0 ? Math.min(1, currentTime / effectiveDuration) : 0;
  const queueIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;
  const saved = currentTrack ? isInProject(currentTrack.id) : false;

  const busAvailable = (bus: StemBus) =>
    !!currentTrack?.stems?.some(s => STEM_BUS_CATEGORIES[bus].includes(s.category));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-[72px] bg-navy-950/85 backdrop-blur-md border-t border-white/[0.08]">
      {/* Mobile: thin progress line on the top edge */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-0.5 bg-navy-800">
        <div className="h-full bg-brand-500" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="h-full px-3 sm:px-4 flex items-center gap-4">
        {/* ─── LEFT: now playing ─── */}
        <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-none md:w-64 lg:w-72">
          {currentTrack?.coverImageUrl ? (
            <CoverImage
              src={currentTrack.coverImageUrl}
              alt=""
              size={40}
              className="w-10 h-10 rounded object-cover border border-white/10 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-navy-900 border border-white/[0.08] flex items-center justify-center shrink-0">
              <AudioLines className="w-4 h-4 text-navy-500" />
            </div>
          )}

          {currentTrack ? (
            <div className="min-w-0 flex-1">
              <Link
                href={`/tracks/${currentTrack.slug}`}
                className="block text-[13px] font-semibold text-white truncate tracking-tight hover:text-brand-400 transition-colors"
              >
                {currentTrack.title}
              </Link>
              <div className="flex items-center gap-2 mt-0.5 min-w-0">
                <span className="text-xs text-slate-400 truncate">{currentTrack.syncMeta?.composer}</span>
                <span className="hidden lg:inline-flex shrink-0 items-center px-1.5 h-4 rounded-sm text-[9px] font-mono font-medium uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  {rightsLabel(currentTrack.syncMeta?.proAffiliation)}
                </span>
              </div>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-slate-400">Nothing loaded</div>
              <div className="text-xs text-navy-400">Select a track to audition</div>
            </div>
          )}

          <button
            onClick={() => currentTrack && toggleProject(currentTrack.id)}
            disabled={!currentTrack}
            className={cn(iconBtn, saved && 'text-brand-400 hover:text-brand-300')}
            title={saved ? 'Remove from project' : 'Add to project'}
            aria-pressed={saved}
          >
            {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>

          {/* Mobile play toggle */}
          <button
            onClick={togglePlay}
            disabled={!currentTrack}
            className="md:hidden w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0 disabled:opacity-40"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
        </div>

        {/* ─── CENTER: transport, scrubber, stems ─── */}
        <div className="hidden md:flex flex-1 min-w-0 flex-col justify-center gap-1.5 border-x border-white/[0.06] px-4 h-full">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={playPrev} disabled={!currentTrack} className={iconBtn} aria-label="Previous / restart">
                <SkipBack className="w-3.5 h-3.5 fill-current" />
              </button>
              <button
                onClick={togglePlay}
                disabled={!currentTrack}
                className="w-8 h-8 mx-0.5 rounded-full bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:bg-navy-700"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              </button>
              <button
                onClick={playNext}
                disabled={!currentTrack || queueIndex < 0 || queueIndex >= queue.length - 1}
                className={iconBtn}
                aria-label="Next track"
              >
                <SkipForward className="w-3.5 h-3.5 fill-current" />
              </button>
              <button
                onClick={toggleLoop}
                disabled={!currentTrack}
                className={cn(iconBtn, isLooping && 'text-brand-400 bg-brand-600/15 hover:text-brand-300')}
                aria-pressed={isLooping}
                title={isLooping ? 'Loop on' : 'Loop off'}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="w-10 text-right text-[11px] font-mono tabular-nums text-slate-200 shrink-0">
              {formatDuration(currentTime)}
            </span>
            {currentTrack ? (
              <Waveform
                seed={currentTrack.id}
                progress={progress}
                durationSeconds={effectiveDuration}
                isActive
                onSeek={(r) => seek(r * effectiveDuration)}
                bars={120}
                className="flex-1 h-7"
              />
            ) : (
              <div className="flex-1 h-px bg-navy-700" />
            )}
            <span className="w-10 text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
              {formatDuration(effectiveDuration)}
            </span>
          </div>

          {/* Stem monitor: click the name to mute, S to solo */}
          <div className="flex items-center gap-1.5 pl-[190px] min-w-0">
            {STEM_BUSES.map(bus => {
              const available = busAvailable(bus);
              const muted = mutedStems.includes(bus);
              const solo = soloStem === bus;
              return (
                <div
                  key={bus}
                  className={cn(
                    'inline-flex items-center h-5 rounded-sm border text-[10px] font-mono uppercase tracking-wider overflow-hidden shrink-0',
                    !available && 'opacity-30 pointer-events-none',
                    solo ? 'border-brand-500/60 bg-brand-600/15' : 'border-white/[0.08] bg-white/[0.02]',
                  )}
                >
                  <button
                    onClick={() => toggleStemMute(bus)}
                    className={cn(
                      'px-1.5 h-full transition-colors',
                      muted ? 'text-navy-400 line-through' : 'text-slate-300 hover:text-white',
                    )}
                    aria-pressed={muted}
                    title={`${muted ? 'Unmute' : 'Mute'} ${bus}`}
                  >
                    {bus}
                  </button>
                  <button
                    onClick={() => toggleStemSolo(bus)}
                    className={cn(
                      'px-1 h-full border-l border-white/[0.08] transition-colors',
                      solo ? 'text-brand-300 bg-brand-600/20' : 'text-navy-400 hover:text-white',
                    )}
                    aria-pressed={solo}
                    title={`Solo ${bus}`}
                  >
                    S
                  </button>
                </div>
              );
            })}
            {currentTrack && (
              <span className="ml-auto pl-2 text-[10px] font-mono text-navy-400 truncate">{activeMixName}</span>
            )}
          </div>
        </div>

        {/* ─── RIGHT: volume, format, package ─── */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5">
            <button
              onClick={() => setVolume(volume === 0 ? 0.85 : 0)}
              className={iconBtn}
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-navy-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
              aria-label="Volume"
            />
          </div>

          <div className="flex items-center h-7 rounded-md border border-white/[0.08] p-0.5" role="radiogroup" aria-label="Download format">
            {DOWNLOAD_FORMATS.map(fmt => (
              <button
                key={fmt}
                role="radio"
                aria-checked={downloadFormat === fmt}
                onClick={() => setDownloadFormat(fmt)}
                className={cn(
                  'px-1.5 h-full rounded-[4px] text-[10px] font-mono font-medium transition-colors',
                  downloadFormat === fmt ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-200',
                )}
              >
                {fmt}
              </button>
            ))}
          </div>

          <button
            onClick={() => currentTrack && openStems(currentTrack)}
            disabled={!currentTrack}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:bg-navy-700"
          >
            <PackageOpen className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Stem Package</span>
            <span className="xl:hidden">Stems</span>
          </button>

          <button onClick={stopTrack} disabled={!currentTrack} className={iconBtn} aria-label="Eject track">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
