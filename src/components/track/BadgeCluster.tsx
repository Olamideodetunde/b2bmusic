import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Gauge, Activity, KeyRound, Disc3 } from 'lucide-react';
import { rightsLabel, parseMusicalKey, toSlug } from '@/lib/utils';
import { bpmBandFor } from '@/lib/catalog/taxonomy';

interface BadgeClusterProps {
  bpm: number;
  musicalKey: string;
  genre: string;
  moods?: string[];
  proAffiliation?: string;
  energyLevel?: string;
}

const pill = 'inline-flex items-center gap-1 h-6 px-2 rounded-sm text-[11px] font-mono font-medium tabular-nums border transition-colors';

/**
 * The track's badge cluster: BPM, musical key and genre first (each links to its hub page,
 * so the badges double as internal links), then rights, energy and mood descriptors.
 */
export function BadgeCluster({ bpm, musicalKey, genre, moods = [], proAffiliation, energyLevel }: BadgeClusterProps) {
  const band = bpmBandFor(bpm);
  const key = parseMusicalKey(musicalKey);

  return (
    <div className="mt-3 space-y-2">
      <ul className="flex flex-wrap items-center gap-1.5" aria-label="Track specifications">
        <li>
          <Link
            href={`/bpm/${band.slug}`}
            className={`${pill} text-white bg-brand-600/15 border-brand-500/40 hover:border-brand-400`}
            title={`${band.label} tracks`}
          >
            <Activity className="w-3 h-3 text-brand-400" aria-hidden />
            {bpm} BPM
          </Link>
        </li>
        <li>
          <span className={`${pill} text-white bg-white/[0.04] border-white/[0.12]`} title={musicalKey}>
            <KeyRound className="w-3 h-3 text-gold-400" aria-hidden />
            {musicalKey}
            {key.camelot && <span className="text-slate-400">· {key.camelot}</span>}
          </span>
        </li>
        <li>
          <Link
            href={`/genres/${toSlug(genre)}`}
            className={`${pill} text-white bg-white/[0.04] border-white/[0.12] hover:border-brand-400`}
            title={`More ${genre} tracks`}
          >
            <Disc3 className="w-3 h-3 text-brand-400" aria-hidden />
            {genre}
          </Link>
        </li>
      </ul>

      <div className="flex flex-wrap items-center gap-1">
        <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-sm text-[10px] font-mono font-medium uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
          <ShieldCheck className="w-3 h-3" />
          {rightsLabel(proAffiliation)}
        </span>

        {energyLevel && (
          <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-sm text-[10px] font-medium text-brand-300 bg-brand-600/10 border border-brand-500/25">
            <Gauge className="w-3 h-3" />
            {energyLevel}
          </span>
        )}

        {moods.map((mood) => (
          <span
            key={mood}
            className="inline-flex items-center h-5 px-1.5 rounded-sm text-[10px] text-slate-400 bg-white/[0.04] border border-white/[0.06]"
          >
            {mood}
          </span>
        ))}
      </div>
    </div>
  );
}
