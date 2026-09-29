import React from 'react';
import { ShieldCheck, Gauge } from 'lucide-react';
import { rightsLabel } from '@/lib/utils';

interface BadgeClusterProps {
  bpm: number;
  musicalKey: string;
  genre: string;
  moods?: string[];
  proAffiliation?: string;
  energyLevel?: string;
}

/**
 * Rights + descriptor tags under the track title. BPM / key / genre are shown
 * in the mono metadata line above, so they are not repeated as pills here.
 */
export function BadgeCluster({ moods = [], proAffiliation, energyLevel }: BadgeClusterProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2.5">
      <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-sm text-[10px] font-mono font-medium uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
        <ShieldCheck className="w-3 h-3" />
        {rightsLabel(proAffiliation)}
      </span>

      {energyLevel && (
        <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-sm text-[10px] font-medium text-crimson-300 bg-crimson-600/10 border border-crimson-500/25">
          <Gauge className="w-3 h-3" />
          {energyLevel}
        </span>
      )}

      {moods.map((mood) => (
        <span
          key={mood}
          className="inline-flex items-center h-5 px-1.5 rounded-sm text-[10px] text-zinc-400 bg-white/[0.04] border border-white/[0.06]"
        >
          {mood}
        </span>
      ))}
    </div>
  );
}
