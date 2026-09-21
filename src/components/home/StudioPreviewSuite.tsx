'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Layers, 
  Check, 
  AudioLines, 
  Activity,
  Sliders,
  Disc3,
  Cpu
} from 'lucide-react';
import Link from 'next/link';

interface StemChannel {
  id: string;
  name: string;
  type: string;
  peakDb: string;
  isMuted: boolean;
  isSolo: boolean;
  color: string;
  barHeights: number[];
}

const INITIAL_CHANNELS: StemChannel[] = [
  {
    id: 'master',
    name: '01 MASTER WAV',
    type: '24-Bit / 48kHz Broadcast',
    peakDb: '-0.1 dB',
    isMuted: false,
    isSolo: false,
    color: 'from-crimson-600 via-crimson-500 to-crimson-400',
    barHeights: [72, 85, 94, 88, 76, 92, 80, 89, 95, 78, 86, 90],
  },
  {
    id: 'drums',
    name: '02 DRUMS & PERC',
    type: 'Isolated Acoustic & 808',
    peakDb: '-1.4 dB',
    isMuted: false,
    isSolo: false,
    color: 'from-amber-500 via-amber-400 to-orange-400',
    barHeights: [88, 45, 92, 38, 90, 42, 85, 40, 94, 36, 88, 44],
  },
  {
    id: 'synths',
    name: '03 ANALOG SYNTHS',
    type: 'Prophet-6 Warm Arpeggio',
    peakDb: '-3.2 dB',
    isMuted: false,
    isSolo: false,
    color: 'from-rose-500 via-crimson-400 to-rose-300',
    barHeights: [55, 68, 72, 64, 78, 82, 70, 75, 80, 85, 72, 68],
  },
  {
    id: 'bass',
    name: '04 SUB & BASSLINE',
    type: 'Clean 40Hz Fundamental',
    peakDb: '-2.0 dB',
    isMuted: false,
    isSolo: false,
    color: 'from-emerald-500 via-teal-400 to-emerald-300',
    barHeights: [82, 84, 80, 86, 82, 88, 85, 82, 86, 84, 88, 82],
  },
  {
    id: 'ambient',
    name: '05 UNDERSCORE BED',
    type: 'Dialogue-Friendly Air',
    peakDb: '-6.8 dB',
    isMuted: false,
    isSolo: false,
    color: 'from-purple-500 via-fuchsia-400 to-purple-300',
    barHeights: [35, 42, 38, 48, 40, 45, 50, 44, 42, 46, 38, 40],
  },
];

export function StudioPreviewSuite() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [channels, setChannels] = useState<StemChannel[]>(INITIAL_CHANNELS);
  const [activePreset, setActivePreset] = useState<'all' | 'underscore' | 'drums_only'>('all');
  const [timecodeSeconds, setTimecodeSeconds] = useState(42);

  // Timecode simulation
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setTimecodeSeconds(prev => (prev >= 179 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const formatTimecode = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const frames = Math.floor((timecodeSeconds * 24) % 24);
    return `00:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  const toggleMute = (id: string) => {
    setChannels(prev =>
      prev.map(c => (c.id === id ? { ...c, isMuted: !c.isMuted } : c))
    );
  };

  const toggleSolo = (id: string) => {
    setChannels(prev => {
      const target = prev.find(c => c.id === id);
      const willSolo = !target?.isSolo;
      return prev.map(c => ({
        ...c,
        isSolo: c.id === id ? willSolo : false,
      }));
    });
  };

  const applyPreset = (preset: 'all' | 'underscore' | 'drums_only') => {
    setActivePreset(preset);
    if (preset === 'all') {
      setChannels(prev => prev.map(c => ({ ...c, isMuted: false, isSolo: false })));
    } else if (preset === 'underscore') {
      setChannels(prev =>
        prev.map(c => ({
          ...c,
          isMuted: c.id === 'drums' || c.id === 'synths',
          isSolo: false,
        }))
      );
    } else if (preset === 'drums_only') {
      setChannels(prev =>
        prev.map(c => ({
          ...c,
          isMuted: c.id !== 'drums' && c.id !== 'bass',
          isSolo: false,
        }))
      );
    }
  };

  const hasSolo = channels.some(c => c.isSolo);

  return (
    <div className="w-full relative">
      {/* Ambient gradient glow in corner */}
      <div className="absolute -top-24 right-0 w-[500px] h-[500px] bg-crimson-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-24 left-0 w-[500px] h-[500px] bg-crimson-900/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-white/[0.08] relative z-10">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-crimson-600/15 text-crimson-400 border border-crimson-500/30">
              <Cpu className="w-3.5 h-3.5 text-crimson-400 animate-pulse" />
              DAW SYNC DECK // v2.4
            </span>
            <span className="text-xs font-mono text-zinc-400">24-Bit / 48kHz Broadcast Standard</span>
          </div>
          <h3 className="font-syne text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
            Multi-Track Stem Architecture in Action
          </h3>
          <p className="text-sm text-zinc-400 max-w-xl mt-1">
            Test how video editors toggle Alt-Mixes, mute heavy drums for voiceover, or isolate acoustic beds.
          </p>
        </div>

        {/* Quick Mix Mode Switcher */}
        <div className="flex items-center gap-2 bg-obsidian-950/80 p-1.5 rounded-2xl border border-white/10 shrink-0 self-start lg:self-center backdrop-blur-md">
          <span className="text-[10px] font-mono text-zinc-400 uppercase px-2 font-bold">Cutdown Preview:</span>
          <button
            onClick={() => applyPreset('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activePreset === 'all'
                ? 'bg-crimson-600 text-white shadow-md shadow-crimson-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Full Master
          </button>
          <button
            onClick={() => applyPreset('underscore')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activePreset === 'underscore'
                ? 'bg-crimson-600 text-white shadow-md shadow-crimson-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Voiceover Bed
          </button>
          <button
            onClick={() => applyPreset('drums_only')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activePreset === 'drums_only'
                ? 'bg-crimson-600 text-white shadow-md shadow-crimson-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Beat Cut
          </button>
        </div>
      </div>

      {/* Main Dual-Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8 relative z-10">
        
        {/* LEFT: Video Monitor Mockup with DJ Producer Asset (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-black border border-white/10 overflow-hidden relative shadow-2xl group">
          {/* Top Video Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-obsidian-950/90 border-b border-white/10 z-20">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-crimson-500 animate-ping" />
              <span className="text-[10px] font-mono font-bold text-white tracking-widest uppercase">
                TIMELINE SYNC // 4K PRORES
              </span>
            </div>
            <span className="font-mono text-xs text-crimson-400 font-bold bg-crimson-950/80 px-2 py-0.5 rounded border border-crimson-800/60 shadow-[0_0_8px_rgba(220,38,38,0.3)]">
              {formatTimecode(timecodeSeconds)}
            </span>
          </div>

          {/* Video Frame Overlay with DJ Producer Background */}
          <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
            <img
              src="/banners/banner-dj-producer.jpg"
              alt="DJ Studio Session"
              className={`w-full h-full object-cover transition-transform duration-700 ${
                isPlaying ? 'scale-105 filter brightness-95 contrast-115' : 'filter brightness-60'
              }`}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />

            {/* Letterbox Lines */}
            <div className="absolute inset-x-0 top-0 h-[10%] bg-black/60 border-b border-white/5 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-[10%] bg-black/60 border-t border-white/5 pointer-events-none" />

            {/* Center Play/Pause button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-16 h-16 rounded-full btn-crimson text-white flex items-center justify-center shadow-2xl relative z-30 transition-transform active:scale-95 group-hover:scale-110"
              aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
            </button>

            {/* Video HUD */}
            <div className="absolute bottom-4 left-4 z-20 text-left">
              <span className="text-[10px] font-mono text-zinc-400 block font-semibold">SCENE 04 / TAKE 02</span>
              <span className="text-xs font-bold text-white drop-shadow">Aura of Silicon · Commercial Sync</span>
            </div>

            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 bg-black/70 px-2 py-0.5 rounded border border-emerald-500/30 backdrop-blur-sm">
              <Check className="w-3 h-3" />
              <span>SYNC LOCKED</span>
            </div>
          </div>

          {/* Bottom Audio Scrubber */}
          <div className="p-4 bg-obsidian-950/90 border-t border-white/10">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
              <span className="flex items-center gap-1 text-crimson-400 font-bold">
                <Activity className="w-3.5 h-3.5" />
                <span>NLE TIMELINE COMPATIBLE</span>
              </span>
              <span>Premiere · DaVinci · Final Cut Pro</span>
            </div>

            <div className="w-full h-1.5 bg-obsidian-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-crimson-600 to-crimson-400 shadow-[0_0_8px_#EF4444] transition-all duration-300"
                style={{ width: `${(timecodeSeconds / 180) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Stems Channels Mixer (7 cols) */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between px-1 text-xs font-mono text-zinc-400 uppercase font-semibold">
            <span>Channel &amp; Frequency Stem</span>
            <div className="flex items-center gap-8 mr-2">
              <span>Metering</span>
              <span>Solo / Mute</span>
            </div>
          </div>

          {channels.map((channel) => {
            const isAudible = isPlaying && (hasSolo ? channel.isSolo : !channel.isMuted);

            return (
              <div
                key={channel.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  isAudible
                    ? 'bg-obsidian-900/90 border-white/10 shadow-sm backdrop-blur-md'
                    : 'bg-obsidian-950/50 border-white/5 opacity-50'
                }`}
              >
                {/* Channel Name & Subtitle */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white truncate">
                      {channel.name}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500 hidden sm:inline">
                      {channel.peakDb}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {channel.type}
                  </p>
                </div>

                {/* Animated Mini Waveform Visualizer */}
                <div className="flex items-center gap-[2px] h-7 w-28 shrink-0">
                  {channel.barHeights.map((h, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 rounded-full transition-all duration-150 ${
                        isAudible
                          ? `bg-gradient-to-t ${channel.color} ${isPlaying ? 'bar-playing shadow-[0_0_4px_rgba(220,38,38,0.7)]' : ''}`
                          : 'bg-obsidian-700'
                      }`}
                      style={{
                        height: isAudible ? `${h}%` : '20%',
                        animationDelay: `${idx * 0.06}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Solo / Mute Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleSolo(channel.id)}
                    className={`w-7 h-7 rounded-lg font-mono text-xs font-bold transition-all border ${
                      channel.isSolo
                        ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30'
                        : 'bg-obsidian-950 text-zinc-400 border-white/10 hover:text-white'
                    }`}
                    title="Solo Channel"
                  >
                    S
                  </button>
                  <button
                    onClick={() => toggleMute(channel.id)}
                    className={`w-7 h-7 rounded-lg font-mono text-xs font-bold transition-all border ${
                      channel.isMuted
                        ? 'bg-crimson-600 text-white border-crimson-500 shadow-md shadow-crimson-600/30'
                        : 'bg-obsidian-950 text-zinc-400 border-white/10 hover:text-white'
                    }`}
                    title="Mute Channel"
                  >
                    M
                  </button>
                </div>
              </div>
            );
          })}

          {/* Quick license guarantee note */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All 6 isolated stems delivered upon license checkout</span>
            </div>
            <Link
              href="/#catalog"
              className="text-crimson-400 hover:text-crimson-300 font-bold inline-flex items-center gap-1 transition-colors"
            >
              Audition full catalog tracks →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
