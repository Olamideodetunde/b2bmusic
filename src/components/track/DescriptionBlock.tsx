'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileCheck2, Copy, Check, ShieldCheck, Radio, Layers } from 'lucide-react';
import { SyncMeta } from '@/lib/db/types';
import { toSlug } from '@/lib/utils';

interface DescriptionBlockProps {
  description: string;
  useCases: string[];
  targetKeyword: string;
  syncMeta?: SyncMeta;
  trackTitle: string;
  bpm: number;
  musicalKey: string;
}

export function DescriptionBlock({
  description,
  useCases,
  targetKeyword,
  syncMeta,
  trackTitle,
  bpm,
  musicalKey,
}: DescriptionBlockProps) {
  const [copiedCueSheet, setCopiedCueSheet] = useState(false);

  // Only real metadata — editors paste this into broadcast cue sheets, so never invent values.
  const cueRows = ([
    ['Title', trackTitle],
    ['Composer', syncMeta?.composer],
    ['Publisher', syncMeta?.publisher],
    ['PRO', syncMeta?.proAffiliation],
    ['ISRC', syncMeta?.isrc, true],
    ['Tempo / Key', `${bpm} BPM · ${musicalKey}`],
    ['Energy', syncMeta?.energyLevel],
  ] as [string, string | undefined, boolean?][]).filter((r): r is [string, string, boolean?] => Boolean(r[1]));
  const hasPublishingData = Boolean(syncMeta?.composer || syncMeta?.isrc);

  const handleCopyCueSheet = () => {
    const text = ['TRACK CUE SHEET DETAILS', ...cueRows.map(([k, v]) => `${k}: ${v}`), 'Rights: 100% Master & Sync Pre-Cleared'].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedCueSheet(true);
    setTimeout(() => setCopiedCueSheet(false), 2500);
  };

  const sectionTitle = 'label-xs mb-2';
  const chip = 'inline-flex items-center h-6 px-2 rounded-sm text-[11px] border';

  return (
    <div className="divide-y divide-white/[0.06]">
      {/* Production notes */}
      <section className="px-4 sm:px-6 py-5">
        <h2 className={sectionTitle}>Production Notes</h2>
        <p className="text-[13px] text-zinc-300 leading-relaxed max-w-3xl">{description}</p>
      </section>

      {/* Cue sheet */}
      <section className="px-4 sm:px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="label-xs flex items-center gap-1.5">
            <FileCheck2 className="w-3 h-3" />
            Broadcast Sync &amp; Cue Sheet
          </h2>
          <button
            onClick={handleCopyCueSheet}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-white/[0.08] text-xs text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
          >
            {copiedCueSheet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
            {copiedCueSheet ? 'Copied' : 'Copy Cue Sheet'}
          </button>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 border-t border-l border-white/[0.06]">
          {cueRows.map(([label, value, accent]) => (
            <div key={label} className="flex items-baseline gap-3 px-3 py-2 border-r border-b border-white/[0.06] min-w-0">
              <dt className="label-xs w-20 shrink-0">{label}</dt>
              <dd className={`text-xs font-mono truncate ${accent ? 'text-crimson-400' : 'text-zinc-200'}`} title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {!hasPublishingData && (
          <p className="mt-3 text-xs text-zinc-500">
            Composer, publisher and ISRC are included in the license documentation sent with your purchase.
          </p>
        )}
      </section>

      {/* Instrumentation & palette */}
      {syncMeta && (
        <section className="px-4 sm:px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <h2 className={sectionTitle}>Instrumentation</h2>
            <div className="flex flex-wrap gap-1">
              {(syncMeta.instrumentation ?? []).map((inst) => (
                <span key={inst} className={`${chip} font-mono bg-white/[0.03] border-white/[0.08] text-zinc-300`}>
                  {inst}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h2 className={sectionTitle}>Sonic Palette</h2>
            <div className="flex flex-wrap gap-1">
              {(syncMeta.soundPalette ?? []).map((pal) => (
                <span key={pal} className={`${chip} bg-white/[0.03] border-white/[0.06] text-zinc-400`}>
                  {pal}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Use cases */}
      {useCases.length > 0 && (
        <section className="px-4 sm:px-6 py-5">
          <h2 className={sectionTitle}>Target Production Scenarios</h2>
          <div className="flex flex-wrap gap-1">
            {useCases.map((uc) => (
              <Link
                key={uc}
                href={`/use-cases/${toSlug(uc)}`}
                className={`${chip} border-white/[0.08] text-zinc-300 hover:text-white hover:border-crimson-500/50 transition-colors`}
              >
                {uc}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Clearance */}
      <section className="px-4 sm:px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />, title: 'Direct Sync Indemnity', body: '100% controlled copyright. No secondary CMO fees, PRO collection demands, or third-party claims.' },
          { icon: <Radio className="w-3.5 h-3.5 text-crimson-400" />, title: 'YouTube CID Safe', body: 'Channel and video whitelisting. No copyright strikes on client channels.' },
          { icon: <Layers className="w-3.5 h-3.5 text-zinc-400" />, title: 'Stems & Cutdowns', body: '24-bit/48kHz WAV master, isolated stems, and :30/:60 cuts for direct NLE drop.' },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-2">
            <span className="mt-0.5">{item.icon}</span>
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 font-jakarta tracking-tight">{item.title}</h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed mt-0.5">{item.body}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
