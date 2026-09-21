'use client';

import React, { useState } from 'react';
import { Track, AltMix } from '@/lib/db/types';
import { useAudio } from './GlobalAudioContext';
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
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface AudioPlayerProps {
  track: Track;
}

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

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [showStemsModal, setShowStemsModal] = useState(false);
  const [copiedIsrc, setCopiedIsrc] = useState(false);

  const isThisTrack = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isThisTrack && isPlaying;

  const currentMix = track.altMixes?.find(m => m.name === activeMixName) || track.altMixes?.[0];
  const effectiveDuration = isThisTrack && duration > 0 ? duration : (currentMix?.durationSeconds || track.durationSeconds);
  const progressPercent = isThisTrack && effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

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

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = ratio * effectiveDuration;
    if (!isThisTrack) {
      playTrack(track, currentMix?.audioUrl, currentMix?.name || 'Full Mix');
    }
    seek(targetSeconds);
  };

  const handleWaveformMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    setHoverTime(ratio * effectiveDuration);
  };

  const handleCopyIsrc = () => {
    if (track.syncMeta?.isrc) {
      navigator.clipboard.writeText(track.syncMeta.isrc);
      setCopiedIsrc(true);
      setTimeout(() => setCopiedIsrc(false), 2000);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
      {/* Futuristic Background Crimson Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-crimson-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* ─── Header & Mix Switcher ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-crimson-500 animate-pulse shadow-[0_0_10px_#EF4444]" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-crimson-400">
                Sync Editor Deck
              </span>
              <span className="text-xs text-zinc-600">•</span>
              <span className="font-mono text-xs text-zinc-400">
                {track.bpm} BPM · {track.musicalKey}
              </span>
            </div>
            <h3 className="font-syne text-xl font-black text-white tracking-tight mt-0.5 drop-shadow-sm">{track.title}</h3>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {track.syncMeta?.isrc && (
            <button
              onClick={handleCopyIsrc}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-obsidian-900/80 hover:bg-obsidian-800 border border-white/10 text-xs font-mono text-zinc-300 transition-colors"
              title="Copy ISRC for cue sheet"
            >
              {copiedIsrc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
              <span>{track.syncMeta.isrc}</span>
            </button>
          )}

          <button
            onClick={() => setShowStemsModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-crimson-600/20 hover:bg-crimson-600/35 border border-crimson-500/40 text-xs font-semibold text-crimson-300 transition-all shadow-lg shadow-crimson-950/40"
          >
            <Layers className="w-3.5 h-3.5 text-crimson-400" />
            <span>Stems ({track.stems?.length || 6})</span>
          </button>
        </div>
      </div>

      {/* ─── Alt-Mix Selector Tabs ─── */}
      <div className="my-5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">
            Select Mix Version &amp; Cutdown
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">
            Active: <span className="text-crimson-400 font-bold">{isThisTrack ? activeMixName : 'Full Mix'}</span>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {track.altMixes?.map((mix) => {
            const isMixActive = isThisTrack && activeMixName === mix.name;
            return (
              <button
                key={mix.id}
                onClick={() => handleMixClick(mix)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  isMixActive
                    ? 'bg-crimson-600 text-white border-crimson-500 shadow-lg shadow-crimson-600/40 scale-[1.02]'
                    : 'bg-obsidian-900/80 hover:bg-obsidian-800 text-zinc-300 border-white/10 hover:text-white'
                }`}
              >
                <span>{mix.name}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isMixActive ? 'bg-white/20 text-white' : 'bg-black/40 text-zinc-400'
                }`}>
                  {formatDuration(mix.durationSeconds)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Glowing Crimson Waveform ─── */}
      <div className="my-6">
        <div
          onClick={handleWaveformClick}
          onMouseMove={handleWaveformMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          className={`relative h-20 bg-obsidian-950/90 border border-white/[0.08] rounded-2xl px-4 py-2 flex items-center gap-[2.5px] cursor-pointer group select-none overflow-hidden shadow-inner ${
            isCurrentlyPlaying ? 'laser-scanner border-crimson-500/30' : ''
          }`}
          title="Click to scrub"
        >
          {/* Played region tint */}
          {progressPercent > 0 && (
            <div
              className="absolute left-0 top-0 bottom-0 bg-crimson-600/10 pointer-events-none"
              style={{ width: `${progressPercent}%` }}
            />
          )}

          {/* Waveform Bars */}
          {Array.from({ length: 64 }).map((_, i) => {
            const barProgress = (i / 64) * 100;
            const isPlayed = progressPercent >= barProgress;
            const waveFormula = Math.sin(i * 0.2) * 20 + Math.cos(i * 0.4) * 15 + 45;
            const barHeight = Math.max(18, Math.min(95, waveFormula + ((i * 13 + track.id * 19) % 30)));

            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-75 ${
                  isPlayed
                    ? 'bg-gradient-to-t from-crimson-600 via-crimson-500 to-crimson-400 shadow-[0_0_6px_rgba(220,38,38,0.7)]'
                    : 'bg-obsidian-600/70 group-hover:bg-obsidian-500/70'
                } ${isCurrentlyPlaying && isPlayed && i % 3 === 0 ? 'bar-playing' : ''}`}
                style={{
                  height: `${barHeight}%`,
                  animationDelay: `${i * 0.03}s`,
                }}
              />
            );
          })}

          {/* Hover timestamp tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute top-1.5 text-[10px] font-mono bg-obsidian-800 text-white px-2 py-0.5 rounded border border-white/20 pointer-events-none shadow-xl"
              style={{ left: `${Math.min(90, Math.max(4, (hoverTime / effectiveDuration) * 100))}%` }}
            >
              {formatDuration(hoverTime)}
            </div>
          )}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_#FFFFFF] pointer-events-none transition-all duration-75"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Time + Format Label */}
        <div className="flex items-center justify-between mt-2 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{isThisTrack ? formatDuration(currentTime) : '0:00'}</span>
            <span>/</span>
            <span>{formatDuration(effectiveDuration)}</span>
          </div>
          <div className="text-[11px]">
            <span className="text-zinc-500">FORMAT: </span>
            <span className="text-zinc-300 font-semibold">24-Bit / 48kHz WAV Broadcast</span>
          </div>
        </div>
      </div>

      {/* ─── Transport Controls ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
        <div className="flex items-center gap-3">
          {/* Play / Pause */}
          <button
            onClick={handlePlayClick}
            className="w-14 h-14 rounded-full btn-crimson text-white flex items-center justify-center shadow-2xl shadow-crimson-600/50"
            aria-label={isCurrentlyPlaying ? 'Pause' : 'Play'}
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => seek(0)}
            className="p-2.5 rounded-xl bg-obsidian-900/80 hover:bg-obsidian-800 text-zinc-400 hover:text-white transition-colors border border-white/10"
            title="Restart Track"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleLoop}
            className={`p-2.5 rounded-xl transition-colors border ${
              isLooping
                ? 'bg-crimson-600/20 border-crimson-500 text-crimson-400 shadow-md shadow-crimson-600/20'
                : 'bg-obsidian-900/80 hover:bg-obsidian-800 border-white/10 text-zinc-400 hover:text-white'
            }`}
            title={isLooping ? 'Loop On' : 'Loop Off'}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-obsidian-900/80 px-3 py-1.5 rounded-xl border border-white/10">
            <button
              onClick={() => setVolume(volume === 0 ? 0.85 : 0)}
              className="text-zinc-400 hover:text-white"
            >
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-obsidian-700 rounded-lg appearance-none cursor-pointer accent-crimson-500"
              aria-label="Volume"
            />
          </div>

          <a
            href={track.previewAudioUrl}
            download={`${track.slug}-preview.mp3`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-obsidian-900/80 hover:bg-obsidian-800 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Preview MP3</span>
          </a>
        </div>
      </div>

      {/* ─── Stems Modal ─── */}
      {showStemsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-obsidian-950 border border-white/15 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-crimson-500" />
                <div>
                  <h4 className="font-syne text-base font-bold text-white">Deliverable Audio Stems</h4>
                  <p className="text-xs text-zinc-400">Included with Broadcast &amp; Full Buyout licenses</p>
                </div>
              </div>
              <button
                onClick={() => setShowStemsModal(false)}
                className="text-zinc-400 hover:text-white text-lg font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="my-4 space-y-2 max-h-72 overflow-y-auto pr-1">
              {track.stems?.map((stem, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-white/10"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-bold text-zinc-200 truncate">{stem.name}</div>
                    <div className="text-[11px] text-zinc-500">{stem.category}</div>
                  </div>
                  <span className="text-[10px] font-mono text-crimson-400 bg-crimson-950/80 px-2 py-0.5 rounded border border-crimson-800/60 shrink-0">
                    {stem.format}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Total Archive: ~420 MB Uncompressed</span>
              <button
                onClick={() => setShowStemsModal(false)}
                className="btn-crimson text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
