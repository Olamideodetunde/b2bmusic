'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Track } from '@/lib/db/types';

export type StemBus = 'Master' | 'Drums' | 'Bass' | 'Melody' | 'Other';

/** Maps a StemTrack.category onto the dock's five stem buses. */
export const STEM_BUS_CATEGORIES: Record<StemBus, string[]> = {
  Master: ['Master'],
  Drums: ['Drums'],
  Bass: ['Bass'],
  Melody: ['Synths & Guitars', 'Acoustic Elements'],
  Other: ['FX & Risers'],
};

interface AudioContextType {
  currentTrack: Track | null;
  activeMixName: string;
  isPlaying: boolean;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playTrack: (track: Track, customUrl?: string, mixName?: string) => void;
  switchMix: (customUrl: string, mixName: string) => void;
  togglePlay: () => void;
  toggleLoop: () => void;
  stopTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  // ── Queue (drives Prev / Next in the dock) ──
  queue: Track[];
  setQueue: (tracks: Track[]) => void;
  playNext: () => void;
  playPrev: () => void;
  // ── Stem monitor state (mute / solo per bus) ──
  mutedStems: StemBus[];
  soloStem: StemBus | null;
  toggleStemMute: (bus: StemBus) => void;
  toggleStemSolo: (bus: StemBus) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [activeMixName, setActiveMixName] = useState<string>('Full Mix');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [queue, setQueue] = useState<Track[]>([]);
  const [mutedStems, setMutedStems] = useState<StemBus[]>([]);
  const [soloStem, setSoloStem] = useState<StemBus | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      if (audio.loop) return;
      setIsPlaying(false);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // The preview is a single bounced file, so the only audible stem control is the
  // Master bus: muting it (or soloing another bus) silences the element. Per-bus
  // state is kept so a multi-buffer stem engine can consume it later.
  useEffect(() => {
    if (!audioRef.current) return;
    const masterSilenced = mutedStems.includes('Master') || (soloStem !== null && soloStem !== 'Master');
    audioRef.current.muted = masterSilenced;
  }, [mutedStems, soloStem]);

  const playTrack = (track: Track, customUrl?: string, mixName: string = 'Full Mix') => {
    if (!audioRef.current) return;

    const targetUrl = customUrl || track.previewAudioUrl;

    if (currentTrack?.id === track.id && activeMixName === mixName && audioRef.current.src.includes(targetUrl)) {
      togglePlay();
      return;
    }

    if (currentTrack?.id !== track.id) {
      setMutedStems([]);
      setSoloStem(null);
    }

    setCurrentTrack(track);
    setActiveMixName(mixName);
    audioRef.current.src = targetUrl;
    audioRef.current.volume = volume;
    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch(err => {
      console.warn("Audio playback interrupted or blocked:", err);
    });
  };

  const switchMix = (customUrl: string, mixName: string) => {
    if (!audioRef.current || !currentTrack) return;
    setActiveMixName(mixName);
    const wasPlaying = isPlaying;
    const currentPosition = audioRef.current.currentTime;
    
    audioRef.current.src = customUrl;
    audioRef.current.currentTime = Math.min(currentPosition, audioRef.current.duration || currentPosition);
    if (wasPlaying) {
      audioRef.current.play().catch(console.warn);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else if (currentTrack) {
      audioRef.current.play().catch(console.warn);
    }
  };

  const toggleLoop = () => {
    if (!audioRef.current) return;
    const nextState = !isLooping;
    setIsLooping(nextState);
    audioRef.current.loop = nextState;
  };

  const seek = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const stopTrack = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.src = '';
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const queueIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;

  const playNext = () => {
    if (queueIndex < 0 || queueIndex >= queue.length - 1) return;
    playTrack(queue[queueIndex + 1]);
  };

  const playPrev = () => {
    // Standard transport behaviour: first press restarts, second goes back.
    if (currentTime > 3 || queueIndex <= 0) {
      seek(0);
      return;
    }
    playTrack(queue[queueIndex - 1]);
  };

  const toggleStemMute = (bus: StemBus) => {
    setMutedStems(prev => (prev.includes(bus) ? prev.filter(b => b !== bus) : [...prev, bus]));
  };

  const toggleStemSolo = (bus: StemBus) => {
    setSoloStem(prev => (prev === bus ? null : bus));
  };

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        activeMixName,
        isPlaying,
        isLooping,
        currentTime,
        duration,
        volume,
        playTrack,
        switchMix,
        togglePlay,
        toggleLoop,
        stopTrack,
        seek,
        setVolume,
        queue,
        setQueue,
        playNext,
        playPrev,
        mutedStems,
        soloStem,
        toggleStemMute,
        toggleStemSolo,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
