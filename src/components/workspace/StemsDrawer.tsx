'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { X, Layers, Download, ArrowRight } from 'lucide-react';
import { useWorkspace, DOWNLOAD_FORMATS } from './WorkspaceContext';
import { STEM_BUS_CATEGORIES, StemBus } from '@/components/audio/GlobalAudioContext';
import { cn, formatDuration } from '@/lib/utils';

const busFor = (category: string): StemBus =>
  (Object.keys(STEM_BUS_CATEGORIES) as StemBus[]).find(bus => STEM_BUS_CATEGORIES[bus].includes(category)) || 'Other';

/** Right-hand stems inspector, opened from table rows, the dock and the track deck. */
export function StemsDrawer() {
  const { stemsTrack: track, closeStems, downloadFormat, setDownloadFormat } = useWorkspace();

  useEffect(() => {
    if (!track) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeStems();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [track, closeStems]);

  if (!track) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="stems-drawer-title">
      <div className="absolute inset-0 bg-black/60" onClick={closeStems} />

      <aside className="absolute top-0 right-0 bottom-0 w-full sm:w-[420px] bg-obsidian-950 border-l border-white/[0.08] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.08]">
          {track.coverImageUrl && (
            <img src={track.coverImageUrl} alt="" className="w-10 h-10 rounded object-cover border border-white/10 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="label-xs flex items-center gap-1.5">
              <Layers className="w-3 h-3" /> Stem Package
            </div>
            <h2 id="stems-drawer-title" className="text-sm font-bold tracking-tight truncate mt-0.5">{track.title}</h2>
            <div className="text-[11px] font-mono tabular-nums text-zinc-400 mt-0.5">
              {track.bpm} BPM · {track.musicalKey} · {formatDuration(track.durationSeconds)}
            </div>
          </div>
          <button
            onClick={closeStems}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06]"
            aria-label="Close stems drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
          <span className="label-xs">Delivery Format</span>
          <div className="flex items-center h-7 rounded-md border border-white/[0.08] p-0.5">
            {DOWNLOAD_FORMATS.map(fmt => (
              <button
                key={fmt}
                onClick={() => setDownloadFormat(fmt)}
                className={cn(
                  'px-2 h-full rounded-[4px] text-[10px] font-mono font-medium transition-colors',
                  downloadFormat === fmt ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-200',
                )}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Stem list */}
        <div className="flex-1 overflow-y-auto">
          {track.stems.length === 0 && track.altMixes.length === 0 && (
            <p className="px-4 py-6 text-sm text-zinc-400 leading-relaxed">
              Stems and alt-mixes for this track are delivered with the Commercial and Broadcast licenses.
              The file list isn&apos;t published yet — contact licensing for the full deliverables sheet.
            </p>
          )}
          {track.stems.length > 0 && (
          <div className="grid grid-cols-[1fr_64px_88px] gap-3 px-4 h-8 items-center border-b border-white/[0.06] label-xs sticky top-0 bg-obsidian-950">
            <span>File</span>
            <span>Bus</span>
            <span className="text-right">Spec</span>
          </div>
          )}
          {track.stems.map((stem, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_64px_88px] gap-3 px-4 py-2.5 items-center border-b border-white/[0.04] hover:bg-white/[0.02]"
            >
              <div className="min-w-0">
                <div className="text-xs font-mono text-zinc-200 truncate">{stem.name}</div>
                <div className="text-[11px] text-zinc-500 truncate">{stem.category}</div>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">{busFor(stem.category)}</span>
              <span className="text-[10px] font-mono tabular-nums text-zinc-400 text-right">
                {downloadFormat === 'MP3' ? '320 kbps' : stem.format.replace(/^WAV\s*/, '')}
              </span>
            </div>
          ))}

          {track.altMixes.length > 0 && (
          <div className="px-4 py-3">
            <div className="label-xs mb-2">Alt-Mixes &amp; Cutdowns</div>
            {track.altMixes.map(mix => (
              <div key={mix.id} className="flex items-center justify-between py-1.5 text-xs border-b border-white/[0.04] last:border-0">
                <span className="text-zinc-300 truncate">{mix.name}</span>
                <span className="font-mono tabular-nums text-zinc-500">{formatDuration(mix.durationSeconds)}</span>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 border-t border-white/[0.08] flex items-center gap-2">
          <a
            href={track.previewAudioUrl}
            download={`${track.slug}-preview.mp3`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-white/10 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Preview MP3
          </a>
          <Link
            href={`/tracks/${track.slug}`}
            onClick={closeStems}
            className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-crimson-600 hover:bg-crimson-500 text-white text-xs font-semibold transition-colors"
          >
            License {downloadFormat} Package
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
