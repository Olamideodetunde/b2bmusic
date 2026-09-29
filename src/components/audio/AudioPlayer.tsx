'use client';

import React, { useState } from 'react';
import { Track, AltMix } from '@/lib/db/types';
import { useAudio } from './GlobalAudioContext';
import { Waveform } from './Waveform';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Repeat,
  Layers,
  Check,
  Copy,
  Download,
  Plus,
  AudioLines,
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';

interface AudioPlayerProps {
  track: Track;
}

const toolBtn =
  'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-white/[0.08] text-xs text-slate-300 hover:text-white hover:border-white/20 transition-colors';
const iconBtn =
  'inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors';

export function AudioPlayer({ track }: AudioPlayerProps) {
  const {
    currentTrack,
    activeMixName,
    isPlaying,
    isLooping,
    currentTime,
    duration,
    playTrack,
    switchMix,
    togglePlay,
    toggleLoop,
    seek,
    volume,
    setVolume,
  } = useAudio();
  const { openStems, isInProject, toggleProject } = useWorkspace();

  const [copiedIsrc, setCopiedIsrc] = useState(false);

  const isThisTrack = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isThisTrack && isPlaying;
  const saved = isInProject(track.id);

  const currentMix = track.altMixes?.find(m => m.name === activeMixName) || track.altMixes?.[0];
  const effectiveDuration = isThisTrack && duration > 0 ? duration : (currentMix?.durationSeconds || track.durationSeconds);
  const progress = isThisTrack && effectiveDuration > 0 ? Math.min(1, currentTime / effectiveDuration) : 0;

  const handleMixClick = (mix: AltMix) => {
    if (!isThisTrack) {
      playTrack(track, mix.audioUrl, mix.name);
    } else {
      switchMix(mix.audioUrl, mix.name);
    }
  };

  const handlePlayClick = () => {
    if (!isThisTrack) {
      playTrack(track, currentMix?.audioUrl, currentMix?.name || 'Full Mix');
    } else {
      togglePlay();
    }
  };

  const handleSeek = (ratio: number) => {
    const targetSeconds = ratio * effectiveDuration;
    if (!isThisTrack) {
      playTrack(track, currentMix?.audioUrl, currentMix?.name || 'Full Mix');
    }
    seek(targetSeconds);
  };

  const handleCopyIsrc = () => {
    if (track.syncMeta?.isrc) {
      navigator.clipboard.writeText(track.syncMeta.isrc);
      setCopiedIsrc(true);
      setTimeout(() => setCopiedIsrc(false), 2000);
    }
  };

  return (
    <section aria-label="Sync editor deck">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <AudioLines className="w-3.5 h-3.5 text-brand-500" />
          <span className="label-xs !text-slate-300">Sync Editor Deck</span>
          <span className="text-navy-500">·</span>
          <span className="text-[11px] font-mono text-slate-400">
            {isThisTrack ? activeMixName : 'Full Mix'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {track.syncMeta?.isrc && (
            <button onClick={handleCopyIsrc} className={cn(toolBtn, 'font-mono')} title="Copy ISRC for cue sheet">
              {copiedIsrc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span className="tabular-nums">{track.syncMeta.isrc}</span>
            </button>
          )}
          <button
            onClick={() => toggleProject(track.id)}
            className={cn(toolBtn, saved && 'border-brand-500/50 text-brand-300')}
            aria-pressed={saved}
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {saved ? 'In Project' : 'Add to Project'}
          </button>
          {track.stems && track.stems.length > 0 && (
            <button onClick={() => openStems(track)} className={toolBtn}>
              <Layers className="w-3.5 h-3.5 text-brand-400" />
              Stems <span className="font-mono tabular-nums text-slate-500">{track.stems.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Waveform + transport ─── */}
      <div className="px-4 sm:px-6 pt-6 pb-3">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlayClick}
            className="w-11 h-11 shrink-0 rounded-full bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center transition-colors"
            aria-label={isCurrentlyPlaying ? 'Pause' : 'Play'}
          >
            {isCurrentlyPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <Waveform
            seed={track.id}
            progress={progress}
            durationSeconds={effectiveDuration}
            isActive={isThisTrack}
            onSeek={handleSeek}
            bars={160}
            className="flex-1 h-14"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pl-[60px]">
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono tabular-nums text-slate-200 w-10">
              {isThisTrack ? formatDuration(currentTime) : '0:00'}
            </span>
            <span className="text-xs font-mono text-slate-600">/</span>
            <span className="text-xs font-mono tabular-nums text-slate-500 w-10 pl-1">{formatDuration(effectiveDuration)}</span>

            <span className="w-px h-4 bg-white/[0.08] mx-2" />
            <button onClick={() => seek(0)} className={iconBtn} title="Restart track" disabled={!isThisTrack}>
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleLoop}
              className={cn(iconBtn, isLooping && 'text-brand-400 bg-brand-600/15')}
              title={isLooping ? 'Loop on' : 'Loop off'}
              aria-pressed={isLooping}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 ml-1">
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
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500" title="The license delivers the full-quality WAV master">MP3 preview · WAV on license</span>
            <a
              href={track.previewAudioUrl}
              download={`${track.slug}-preview.mp3`}
              target="_blank"
              rel="noopener noreferrer"
              className={toolBtn}
            >
              <Download className="w-3.5 h-3.5" />
              Preview MP3
            </a>
          </div>
        </div>
      </div>

      {/* ─── Alt-mix & cutdown versions (only when the track has them) ─── */}
      {track.altMixes && track.altMixes.length > 0 && (
      <div className="border-t border-white/[0.06]">
        <div className="grid grid-cols-[28px_minmax(0,1fr)_88px_52px] gap-3 items-center h-8 px-4 sm:px-6 label-xs">
          <span />
          <span>Version</span>
          <span>Type</span>
          <span className="text-right">Time</span>
        </div>
        {track.altMixes?.map((mix) => {
          const isMixActive = isThisTrack && activeMixName === mix.name;
          return (
            <button
              key={mix.id}
              onClick={() => handleMixClick(mix)}
              className={cn(
                'group w-full grid grid-cols-[28px_minmax(0,1fr)_88px_52px] gap-3 items-center px-4 sm:px-6 py-2 text-left border-t border-white/[0.04] transition-colors',
                isMixActive ? 'bg-brand-600/[0.07] shadow-[inset_2px_0_0_#0a64f0]' : 'hover:bg-navy-900/60',
              )}
            >
              <span
                className={cn(
                  'w-6 h-6 rounded-full inline-flex items-center justify-center',
                  isMixActive ? 'bg-brand-600 text-white' : 'text-slate-500 group-hover:text-white group-hover:bg-white/[0.08]',
                )}
              >
                {isMixActive && isPlaying ? <Pause className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current ml-px" />}
              </span>
              <span className={cn('text-[13px] truncate', isMixActive ? 'text-brand-200 font-medium' : 'text-slate-200')}>
                {mix.name}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{mix.type}</span>
              <span className="text-xs font-mono tabular-nums text-slate-400 text-right">{formatDuration(mix.durationSeconds)}</span>
            </button>
          );
        })}
      </div>
      )}
    </section>
  );
}
