'use client';

import React, { useState, useMemo } from 'react';
import { Track } from '@/lib/db/types';
import { TrackCard } from './TrackCard';
import { Search, RotateCcw, Sparkles } from 'lucide-react';

interface CatalogExplorerProps {
  initialTracks: Track[];
}

export function CatalogExplorer({ initialTracks }: CatalogExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedEnergy, setSelectedEnergy] = useState<string>('all');
  const [bpmRange, setBpmRange] = useState<string>('all');

  const genres = useMemo(() => {
    const list = Array.from(new Set(initialTracks.map(t => t.genre)));
    return ['all', ...list];
  }, [initialTracks]);

  const filteredTracks = useMemo(() => {
    return initialTracks.filter(track => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = track.title.toLowerCase().includes(q);
        const matchesKeyword = track.targetKeyword.toLowerCase().includes(q);
        const matchesGenre = track.genre.toLowerCase().includes(q);
        const matchesMood = track.moods.some(m => m.toLowerCase().includes(q));
        const matchesUse = track.useCases.some(u => u.toLowerCase().includes(q));
        const matchesInst = track.syncMeta?.instrumentation.some(i => i.toLowerCase().includes(q));
        if (!matchesTitle && !matchesKeyword && !matchesGenre && !matchesMood && !matchesUse && !matchesInst) {
          return false;
        }
      }
      if (selectedGenre !== 'all' && track.genre.toLowerCase() !== selectedGenre.toLowerCase()) return false;
      if (selectedEnergy !== 'all' && track.syncMeta?.energyLevel !== selectedEnergy) return false;
      if (bpmRange === 'slow' && track.bpm >= 90) return false;
      if (bpmRange === 'mid' && (track.bpm < 90 || track.bpm > 120)) return false;
      if (bpmRange === 'fast' && track.bpm <= 120) return false;
      return true;
    });
  }, [initialTracks, searchQuery, selectedGenre, selectedEnergy, bpmRange]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedGenre('all');
    setSelectedEnergy('all');
    setBpmRange('all');
  };

  const hasActiveFilters = searchQuery !== '' || selectedGenre !== 'all' || selectedEnergy !== 'all' || bpmRange !== 'all';

  const pillBase = 'px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all border';
  const pillActive = 'bg-crimson-600/25 text-crimson-300 border-crimson-500/50 shadow-md shadow-crimson-600/20 font-bold';
  const pillIdle = 'bg-obsidian-900/80 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white';

  const btnBase = 'px-2.5 py-1.5 rounded-lg font-mono font-medium transition-colors text-xs';
  const btnActive = 'bg-crimson-600 text-white shadow-md shadow-crimson-600/30';
  const btnIdle = 'text-zinc-400 hover:text-white';

  return (
    <div className="space-y-5">
      {/* ─── Seamless Boundless Filter Bar (No Boxy Borders) ─── */}
      <div className="w-full pb-6 border-b border-white/[0.08] mb-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by mood, genre, instrument, or scenario (e.g., 'Prophet', 'SaaS', 'Chill')…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-full pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-crimson-500 focus:bg-white/[0.07] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-crimson-400 transition-colors font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* BPM Filter */}
          <div className="flex items-center gap-1 self-start md:self-auto shrink-0 bg-white/[0.04] p-1 rounded-full border border-white/10">
            <span className="px-2.5 text-zinc-400 font-mono text-[10px] uppercase font-bold">BPM:</span>
            {[
              { label: 'All', val: 'all' },
              { label: '<90', val: 'slow' },
              { label: '90–120', val: 'mid' },
              { label: '120+', val: 'fast' },
            ].map((btn) => (
              <button
                key={btn.val}
                onClick={() => setBpmRange(btn.val)}
                className={`px-3 py-1.5 rounded-full font-mono text-xs font-semibold transition-all ${
                  bpmRange === btn.val
                    ? 'bg-crimson-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Energy Filter */}
          <div className="flex items-center gap-1 self-start md:self-auto shrink-0 bg-white/[0.04] p-1 rounded-full border border-white/10">
            <span className="px-2.5 text-zinc-400 font-mono text-[10px] uppercase font-bold">Energy:</span>
            {['All', 'Subtle', 'Medium', 'High', 'Explosive'].map((e) => (
              <button
                key={e}
                onClick={() => setSelectedEnergy(e === 'All' ? 'all' : e)}
                className={`px-3 py-1.5 rounded-full font-mono text-xs font-semibold transition-all ${
                  selectedEnergy === (e === 'All' ? 'all' : e)
                    ? 'bg-crimson-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Genre Pill Row */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-4 border-t border-white/[0.06] pb-1">
          <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold shrink-0">Genre:</span>
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all border ${
                selectedGenre === genre
                  ? 'bg-crimson-600 text-white border-crimson-500 shadow-md'
                  : 'bg-white/[0.03] text-zinc-300 border-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              {genre === 'all' ? 'All Genres' : genre}
            </button>
          ))}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-crimson-400 hover:text-crimson-300 px-3.5 py-1.5 rounded-full bg-crimson-600/15 border border-crimson-500/30 ml-auto shrink-0 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white font-syne">
            {filteredTracks.length} {filteredTracks.length === 1 ? 'Track' : 'Tracks'} Available
          </span>
          <span className="text-xs text-zinc-600">•</span>
          <span className="text-xs text-zinc-400">All include Master WAV, Alt-Mixes &amp; Stems</span>
        </div>
        <div className="text-xs text-zinc-400 font-mono">
          from <span className="text-crimson-400 font-bold">$10</span>
        </div>
      </div>

      {/* Track List */}
      {filteredTracks.length > 0 ? (
        <div className="space-y-3">
          {filteredTracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-12 text-center shadow-xl">
          <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <h3 className="font-syne text-base font-bold text-white mb-1">No tracks matching your filters</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
            Try loosening your BPM or Energy filter, or clear your search term.
          </p>
          <button
            onClick={resetFilters}
            className="btn-crimson text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
