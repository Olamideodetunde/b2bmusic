'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, X, SlidersHorizontal, Layers } from 'lucide-react';
import { Track } from '@/lib/db/types';
import { TrackTable } from './TrackTable';
import { CamelotWheel, camelotName, compatibleKeys } from './CamelotWheel';
import { CheckList, DualRange, FilterPopover, Segmented } from './FilterControls';
import { cn, parseMusicalKey } from '@/lib/utils';

interface CatalogExplorerProps {
  initialTracks: Track[];
}

type Vocal = 'any' | 'instrumental' | 'female' | 'male';

const BPM_MIN = 60;
const BPM_MAX = 180;
const BPM_PRESETS: { label: string; range: [number, number] }[] = [
  { label: 'Slow <90', range: [BPM_MIN, 89] },
  { label: 'Mid 90–125', range: [90, 125] },
  { label: 'Fast 125+', range: [125, BPM_MAX] },
];
const ENERGY_LEVELS = ['Subtle', 'Medium', 'High', 'Explosive'];

const toggleIn = (list: string[], value: string) =>
  list.includes(value) ? list.filter(v => v !== value) : [...list, value];

const countBy = (values: string[]) =>
  values.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});

function CatalogExplorerInner({ initialTracks }: CatalogExplorerProps) {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';

  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [genres, setGenres] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [harmonicMatch, setHarmonicMatch] = useState(false);
  const [energy, setEnergy] = useState<string[]>([]);
  const [bpmRange, setBpmRange] = useState<[number, number]>([BPM_MIN, BPM_MAX]);
  const [vocal, setVocal] = useState<Vocal>('any');
  const [stemsOnly, setStemsOnly] = useState(false);

  // The top-bar search writes ?q= — mirror it here.
  useEffect(() => {
    setSearchQuery(urlQuery);
  }, [urlQuery]);

  const updateQuery = (value: string) => {
    setSearchQuery(value);
    // Keep the URL shareable without a server round-trip.
    const params = new URLSearchParams(window.location.search);
    if (value) params.set('q', value);
    else params.delete('q');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  };

  // ── Facet option lists (derived from the catalog) ──
  const genreCounts = useMemo(() => countBy(initialTracks.map(t => t.genre)), [initialTracks]);
  const moodCounts = useMemo(() => countBy(initialTracks.flatMap(t => t.moods)), [initialTracks]);
  const energyCounts = useMemo(
    () => countBy(initialTracks.map(t => t.syncMeta?.energyLevel).filter(Boolean) as string[]),
    [initialTracks],
  );
  const availableKeys = useMemo(
    () => new Set(initialTracks.map(t => parseMusicalKey(t.musicalKey).camelot).filter(Boolean) as string[]),
    [initialTracks],
  );

  const effectiveKeys = useMemo(
    () => (harmonicMatch ? Array.from(new Set(keys.flatMap(compatibleKeys))) : keys),
    [keys, harmonicMatch],
  );

  const bpmActive = bpmRange[0] !== BPM_MIN || bpmRange[1] !== BPM_MAX;

  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialTracks.filter(track => {
      if (q) {
        const haystack = [
          track.title,
          track.targetKeyword,
          track.genre,
          track.syncMeta?.composer ?? '',
          ...track.moods,
          ...track.useCases,
          ...(track.syncMeta?.instrumentation ?? []),
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (genres.length && !genres.includes(track.genre)) return false;
      if (moods.length && !track.moods.some(m => moods.includes(m))) return false;
      if (effectiveKeys.length) {
        const code = parseMusicalKey(track.musicalKey).camelot;
        if (!code || !effectiveKeys.includes(code)) return false;
      }
      if (energy.length && !energy.includes(track.syncMeta?.energyLevel ?? '')) return false;
      if (track.bpm < bpmRange[0] || track.bpm > bpmRange[1]) return false;
      if (vocal !== 'any' && (track.vocalType ?? 'instrumental') !== vocal) return false;
      if (stemsOnly && !(track.stems?.length > 0)) return false;
      return true;
    });
  }, [initialTracks, searchQuery, genres, moods, effectiveKeys, energy, bpmRange, vocal, stemsOnly]);

  // ── Active filter chips ──
  const chips: { id: string; label: string; clear: () => void }[] = [
    ...(searchQuery ? [{ id: 'q', label: `“${searchQuery}”`, clear: () => updateQuery('') }] : []),
    ...genres.map(g => ({ id: `g-${g}`, label: g, clear: () => setGenres(prev => prev.filter(v => v !== g)) })),
    ...moods.map(m => ({ id: `m-${m}`, label: m, clear: () => setMoods(prev => prev.filter(v => v !== m)) })),
    ...keys.map(k => ({ id: `k-${k}`, label: `${k} ${camelotName(k)}${harmonicMatch ? ' ±' : ''}`, clear: () => setKeys(prev => prev.filter(v => v !== k)) })),
    ...(bpmActive ? [{ id: 'bpm', label: `${bpmRange[0]}–${bpmRange[1]} BPM`, clear: () => setBpmRange([BPM_MIN, BPM_MAX]) }] : []),
    ...energy.map(e => ({ id: `e-${e}`, label: `Energy: ${e}`, clear: () => setEnergy(prev => prev.filter(v => v !== e)) })),
    ...(vocal !== 'any' ? [{ id: 'vocal', label: vocal === 'instrumental' ? 'Instrumental' : `${vocal === 'female' ? 'Female' : 'Male'} vocal`, clear: () => setVocal('any') }] : []),
    ...(stemsOnly ? [{ id: 'stems', label: 'Stems available', clear: () => setStemsOnly(false) }] : []),
  ];

  const resetFilters = () => {
    updateQuery('');
    setGenres([]);
    setMoods([]);
    setKeys([]);
    setHarmonicMatch(false);
    setEnergy([]);
    setBpmRange([BPM_MIN, BPM_MAX]);
    setVocal('any');
    setStemsOnly(false);
  };

  return (
    <div>
      {/* ─── Sync discovery toolbar (sticks to the top of the scroll area) ─── */}
      <div className="md:sticky md:top-16 z-20 relative bg-navy-950/95 backdrop-blur-md border-b border-white/[0.06] px-4 sm:px-6 py-2.5 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search within results */}
          <div className="relative w-full sm:w-44 2xl:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => updateQuery(e.target.value)}
              placeholder="Filter results…"
              className="w-full h-7 bg-white/[0.03] border border-white/[0.08] rounded-md pl-8 pr-7 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/70"
            />
            {searchQuery && (
              <button
                onClick={() => updateQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 inline-flex items-center justify-center text-slate-500 hover:text-white"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <FilterPopover label="Genre" value={genres.length ? String(genres.length) : undefined} active={genres.length > 0}>
            <CheckList options={Object.keys(genreCounts).sort()} counts={genreCounts} selected={genres} onToggle={(v) => setGenres(p => toggleIn(p, v))} />
          </FilterPopover>

          <FilterPopover label="Mood" value={moods.length ? String(moods.length) : undefined} active={moods.length > 0}>
            <CheckList options={Object.keys(moodCounts).sort()} counts={moodCounts} selected={moods} onToggle={(v) => setMoods(p => toggleIn(p, v))} />
          </FilterPopover>

          <FilterPopover
            label="Key"
            value={keys.length ? keys.slice(0, 2).join(' ') + (keys.length > 2 ? ` +${keys.length - 2}` : '') : undefined}
            active={keys.length > 0}
            panelClassName="p-3"
          >
            <CamelotWheel selected={keys} available={availableKeys} onToggle={(code) => setKeys(p => toggleIn(p, code))} />
            <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-white/[0.06]">
              <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={harmonicMatch}
                  onChange={(e) => setHarmonicMatch(e.target.checked)}
                  className="accent-brand-600"
                />
                Include harmonic neighbours
              </label>
              {keys.length > 0 && (
                <button onClick={() => setKeys([])} className="text-[11px] text-slate-500 hover:text-white">Clear</button>
              )}
            </div>
          </FilterPopover>

          <FilterPopover label="BPM" value={bpmActive ? `${bpmRange[0]}–${bpmRange[1]}` : undefined} active={bpmActive} panelClassName="p-3 w-64">
            <div className="flex items-center justify-between mb-3">
              <span className="label-xs">Tempo Range</span>
              <span className="text-xs font-mono tabular-nums text-slate-200">{bpmRange[0]}–{bpmRange[1]}</span>
            </div>
            <DualRange min={BPM_MIN} max={BPM_MAX} value={bpmRange} onChange={setBpmRange} />
            <div className="flex justify-between text-[10px] font-mono text-slate-600 mt-1">
              <span>{BPM_MIN}</span>
              <span>{BPM_MAX}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-3">
              {BPM_PRESETS.map(p => {
                const on = bpmRange[0] === p.range[0] && bpmRange[1] === p.range[1];
                return (
                  <button
                    key={p.label}
                    onClick={() => setBpmRange(on ? [BPM_MIN, BPM_MAX] : p.range)}
                    className={cn(
                      'h-6 rounded-sm text-[10px] font-mono border transition-colors',
                      on ? 'bg-brand-600 border-brand-500 text-white' : 'border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20',
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </FilterPopover>

          <FilterPopover label="Energy" value={energy.length ? String(energy.length) : undefined} active={energy.length > 0}>
            <CheckList options={ENERGY_LEVELS} counts={energyCounts} selected={energy} onToggle={(v) => setEnergy(p => toggleIn(p, v))} />
          </FilterPopover>

          <span className="hidden md:block w-px h-4 bg-white/[0.08] mx-0.5" />

          <Segmented<Vocal>
            label="Vocal presence"
            value={vocal}
            onChange={setVocal}
            options={[
              { value: 'any', label: 'Any' },
              { value: 'instrumental', label: 'Instrumental' },
              { value: 'female', label: 'Female Vox' },
              { value: 'male', label: 'Male Vox' },
            ]}
          />

          <button
            role="switch"
            aria-checked={stemsOnly}
            onClick={() => setStemsOnly(s => !s)}
            className={cn(
              'inline-flex items-center gap-1.5 h-7 px-2 rounded-md border text-xs transition-colors',
              stemsOnly ? 'border-brand-500/50 bg-brand-600/10 text-brand-200' : 'border-white/[0.08] text-slate-300 hover:border-white/20',
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            Stems
            <span className={cn('relative w-6 h-3.5 rounded-full transition-colors', stemsOnly ? 'bg-brand-600' : 'bg-navy-600')}>
              <span className={cn('absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all', stemsOnly ? 'left-3' : 'left-0.5')} />
            </span>
          </button>

          {/* Result count + clear */}
          <div className="ml-auto flex items-center gap-2">
            {chips.length > 0 && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Clear
                <span className="min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-brand-600 text-white text-[10px] font-mono tabular-nums">
                  {chips.length}
                </span>
              </button>
            )}
            <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
              <span className="text-slate-200">{filteredTracks.length}</span> / {initialTracks.length}
            </span>
          </div>
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {chips.map(chip => (
              <button
                key={chip.id}
                onClick={chip.clear}
                className="group inline-flex items-center gap-1 h-5 pl-1.5 pr-1 rounded-sm bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-300 hover:border-brand-500/50 hover:text-white"
                aria-label={`Remove filter ${chip.label}`}
              >
                {chip.label}
                <X className="w-2.5 h-2.5 text-slate-500 group-hover:text-brand-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Results ─── */}
      {filteredTracks.length > 0 ? (
        <TrackTable tracks={filteredTracks} className="border-t-0" />
      ) : (
        <div className="px-6 py-16 text-center border-b border-white/[0.06]">
          <p className="text-sm font-medium text-slate-200">No tracks match these filters</p>
          <p className="text-xs text-slate-500 mt-1">Widen the BPM range, drop a key, or clear the search term.</p>
          <button
            onClick={resetFilters}
            className="mt-4 h-7 px-3 rounded-md border border-white/10 text-xs text-slate-300 hover:text-white hover:border-white/20"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * useSearchParams needs a Suspense boundary on statically rendered routes.
 * The fallback renders the unfiltered table so rows are still in the SSR HTML.
 */
export function CatalogExplorer(props: CatalogExplorerProps) {
  return (
    <Suspense fallback={<TrackTable tracks={props.initialTracks} />}>
      <CatalogExplorerInner {...props} />
    </Suspense>
  );
}
