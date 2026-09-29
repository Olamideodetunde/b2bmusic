'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  Download,
  Plus,
  Check,
  Layers,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Copy,
  FolderOpen,
} from 'lucide-react';
import { Track } from '@/lib/db/types';
import { useAudio } from '@/components/audio/GlobalAudioContext';
import { Waveform } from '@/components/audio/Waveform';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { cn, formatDuration, parseMusicalKey, rightsLabel, toSlug } from '@/lib/utils';

/*
 * Column template, shared by header and rows. Cells are hidden progressively:
 *   base: # · art · title · dur · actions
 *   md:   + BPM · key
 *   lg:   + waveform
 *   xl:   + tags · rights
 */
const GRID =
  'grid items-center gap-x-3 ' +
  'grid-cols-[28px_36px_minmax(0,1fr)_40px_56px] ' +
  'md:grid-cols-[28px_36px_minmax(0,1fr)_40px_64px_40px_104px] ' +
  'lg:grid-cols-[28px_36px_minmax(150px,1fr)_minmax(120px,1.3fr)_40px_64px_40px_104px] ' +
  'xl:grid-cols-[28px_36px_minmax(160px,1.1fr)_minmax(150px,1.5fr)_40px_64px_40px_minmax(120px,1fr)_104px_104px]';

type SortKey = 'title' | 'bpm' | 'key' | 'duration';
type SortState = { key: SortKey; dir: 'asc' | 'desc' } | null;

const camelotOrder = (t: Track) => {
  const code = parseMusicalKey(t.musicalKey).camelot;
  if (!code) return 999;
  return parseInt(code, 10) * 2 + (code.endsWith('B') ? 1 : 0);
};

interface TrackTableProps {
  tracks: Track[];
  /** Show the column header row (off for very short embedded lists). */
  showHeader?: boolean;
  className?: string;
}

export function TrackTable({ tracks, showHeader = true, className }: TrackTableProps) {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return tracks;
    const value = (t: Track): string | number => {
      switch (sort.key) {
        case 'title': return t.title.toLowerCase();
        case 'bpm': return t.bpm;
        case 'key': return camelotOrder(t);
        case 'duration': return t.durationSeconds;
      }
    };
    return [...tracks].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [tracks, sort]);

  const cycleSort = (key: SortKey) => {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const SortHeader = ({ k, children, align = 'left', className: cls }: { k: SortKey; children: React.ReactNode; align?: 'left' | 'right'; className?: string }) => {
    const active = sort?.key === k;
    return (
      <button
        onClick={() => cycleSort(k)}
        className={cn(
          'inline-flex items-center gap-0.5 label-xs hover:text-zinc-200 transition-colors',
          align === 'right' && 'justify-end',
          active && 'text-zinc-200',
          cls,
        )}
        aria-label={`Sort by ${k}`}
      >
        {children}
        {active && (sort?.dir === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />)}
      </button>
    );
  };

  return (
    <div className={cn('border-y border-white/[0.06]', className)} role="table" aria-label="Tracks">
      {showHeader && (
        <div className={cn(GRID, 'h-8 px-3 border-b border-white/[0.06] bg-obsidian-950')} role="row">
          <span className="label-xs text-right">#</span>
          <span />
          <SortHeader k="title">Title</SortHeader>
          <span className="label-xs hidden lg:block">Waveform</span>
          <SortHeader k="bpm" className="hidden md:inline-flex">BPM</SortHeader>
          <SortHeader k="key" className="hidden md:inline-flex">Key</SortHeader>
          <SortHeader k="duration">Time</SortHeader>
          <span className="label-xs hidden xl:block">Mood / Instr.</span>
          <span className="label-xs hidden xl:block">Rights</span>
          <span className="label-xs text-right">Actions</span>
        </div>
      )}
      {sorted.map((track, i) => (
        <TrackRow key={track.id} track={track} index={i + 1} queue={sorted} />
      ))}
    </div>
  );
}

interface TrackRowProps {
  track: Track;
  index: number;
  queue: Track[];
}

const actionBtn =
  'inline-flex items-center justify-center w-6 h-6 rounded text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors';

export function TrackRow({ track, index, queue }: TrackRowProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay, seek, currentTime, duration, setQueue } = useAudio();
  const { isInProject, toggleProject, openStems } = useWorkspace();

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrent && isPlaying;
  const effectiveDuration = isCurrent && duration > 0 ? duration : track.durationSeconds;
  const progress = isCurrent && effectiveDuration > 0 ? Math.min(1, currentTime / effectiveDuration) : 0;
  const key = parseMusicalKey(track.musicalKey);
  const saved = isInProject(track.id);
  const tags = [...track.moods.slice(0, 2), ...(track.syncMeta?.instrumentation?.slice(0, 1) ?? [])];
  const hiddenTagCount = track.moods.length - 2 + Math.max(0, (track.syncMeta?.instrumentation?.length ?? 0) - 1);

  const handlePlay = () => {
    if (!isCurrent) {
      setQueue(queue);
      playTrack(track);
    } else {
      togglePlay();
    }
  };

  const handleSeek = (ratio: number) => {
    if (!isCurrent) {
      setQueue(queue);
      playTrack(track);
    }
    seek(ratio * effectiveDuration);
  };

  return (
    <div
      role="row"
      onDoubleClick={handlePlay}
      className={cn(
        GRID,
        'group relative px-3 py-2.5 border-b border-white/[0.04] last:border-b-0 transition-colors',
        isCurrent
          ? 'bg-crimson-600/[0.07] shadow-[inset_2px_0_0_#DC2626]'
          : 'hover:bg-obsidian-900/60',
      )}
    >
      {/* # / play */}
      <button
        onClick={handlePlay}
        className="relative w-7 h-7 inline-flex items-center justify-center rounded-full justify-self-end"
        aria-label={isCurrentlyPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        <span
          className={cn(
            'text-[11px] font-mono tabular-nums text-zinc-500 group-hover:opacity-0',
            isCurrent && 'opacity-0',
          )}
        >
          {index}
        </span>
        <span
          className={cn(
            'absolute inset-0 inline-flex items-center justify-center rounded-full transition-colors',
            isCurrent
              ? 'bg-crimson-600 text-white'
              : 'opacity-0 group-hover:opacity-100 bg-white/[0.08] text-white hover:bg-crimson-600',
          )}
        >
          {isCurrentlyPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-px" />}
        </span>
      </button>

      {/* Art */}
      {track.coverImageUrl ? (
        <img
          src={track.coverImageUrl}
          alt=""
          loading="lazy"
          className="w-9 h-9 rounded object-cover border border-white/[0.08]"
        />
      ) : (
        <div className="w-9 h-9 rounded bg-obsidian-800 border border-white/[0.08]" />
      )}

      {/* Title / artist / genre */}
      <div className="min-w-0">
        <Link
          href={`/tracks/${track.slug}`}
          className={cn(
            'block text-[13px] font-semibold tracking-tight truncate transition-colors',
            isCurrent ? 'text-crimson-300' : 'text-white hover:text-crimson-400',
          )}
        >
          {track.title}
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 truncate mt-px">
          <span className="truncate text-zinc-400">{track.syncMeta?.composer || 'B2B Music Sync'}</span>
          <span className="text-obsidian-500">·</span>
          <Link href={`/genres/${toSlug(track.genre)}`} className="truncate hover:text-crimson-400 transition-colors">
            {track.genre}
          </Link>
        </div>
      </div>

      {/* Waveform */}
      <Waveform
        seed={track.id}
        progress={progress}
        durationSeconds={effectiveDuration}
        isActive={isCurrent}
        onSeek={handleSeek}
        bars={64}
        className="hidden lg:flex h-7"
      />

      {/* BPM */}
      <span className="hidden md:block text-xs font-mono tabular-nums text-zinc-300">{track.bpm}</span>

      {/* Key */}
      <span className="hidden md:block text-xs font-mono tabular-nums whitespace-nowrap" title={track.musicalKey}>
        <span className="text-zinc-300">{key.camelot ?? '—'}</span>
        <span className="text-zinc-500"> / {key.short}</span>
      </span>

      {/* Duration */}
      <span className="text-xs font-mono tabular-nums text-zinc-400">{formatDuration(track.durationSeconds)}</span>

      {/* Mood + instrument tags */}
      <div className="hidden xl:flex items-center gap-1 min-w-0 overflow-hidden">
        {tags.map((tag, i) => (
          <span
            key={tag}
            className={cn(
              'shrink-0 max-w-[110px] truncate inline-flex items-center h-5 px-1.5 rounded-sm text-[10px] border',
              i < 2
                ? 'bg-white/[0.04] border-white/[0.06] text-zinc-400'
                : 'bg-transparent border-white/[0.06] text-zinc-500 font-mono',
            )}
            title={tag}
          >
            {tag}
          </span>
        ))}
        {hiddenTagCount > 0 && (
          <span className="shrink-0 text-[10px] font-mono text-zinc-600">+{hiddenTagCount}</span>
        )}
      </div>

      {/* Rights */}
      <span className="hidden xl:inline-flex justify-self-start items-center h-5 px-1.5 rounded-sm text-[9px] font-mono font-medium uppercase tracking-wider whitespace-nowrap text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
        {rightsLabel(track.syncMeta?.proAffiliation)}
      </span>

      {/* Actions */}
      <div className="flex items-center justify-end">
        <a
          href={track.previewAudioUrl}
          download={`${track.slug}-preview.mp3`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(actionBtn, 'hidden md:inline-flex')}
          title="Download preview MP3"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={() => toggleProject(track.id)}
          className={cn(actionBtn, saved && 'text-crimson-400 hover:text-crimson-300')}
          title={saved ? 'Remove from project' : 'Add to project'}
          aria-pressed={saved}
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => openStems(track)}
          // Kept in the layout (invisible) when there are no stems, so columns stay aligned.
          className={cn(actionBtn, 'hidden md:inline-flex', track.stems.length === 0 && 'invisible pointer-events-none')}
          title={`Stems (${track.stems.length})`}
          aria-hidden={track.stems.length === 0}
          tabIndex={track.stems.length === 0 ? -1 : undefined}
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
        <RowMenu track={track} />
      </div>
    </div>
  );
}

function RowMenu({ track }: { track: Track }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { openStems } = useWorkspace();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const copyIsrc = () => {
    if (!track.syncMeta?.isrc) return;
    navigator.clipboard.writeText(track.syncMeta.isrc);
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 900);
  };

  const item = 'flex items-center gap-2 w-full h-7 px-2.5 text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white text-left';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(actionBtn, open && 'text-white bg-white/[0.06]')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-48 py-1 rounded-md bg-obsidian-850 border border-white/10 shadow-xl shadow-black/60">
          <Link href={`/tracks/${track.slug}`} className={item} role="menuitem">
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" /> Track details &amp; license
          </Link>
          {(track.stems.length > 0 || track.altMixes.length > 0) && (
            <button onClick={() => { openStems(track); setOpen(false); }} className={item} role="menuitem">
              <Layers className="w-3.5 h-3.5 text-zinc-500" /> Stems &amp; alt-mixes
            </button>
          )}
          {track.syncMeta?.isrc && (
            <button onClick={copyIsrc} className={item} role="menuitem">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
              <span>Copy ISRC</span>
              <span className="ml-auto font-mono text-[10px] text-zinc-500">{track.syncMeta.isrc.slice(-5)}</span>
            </button>
          )}
          <div className="my-1 border-t border-white/[0.06]" />
          <Link href={`/genres/${toSlug(track.genre)}`} className={item} role="menuitem">
            <FolderOpen className="w-3.5 h-3.5 text-zinc-500" /> More {track.genre}
          </Link>
        </div>
      )}
    </div>
  );
}
