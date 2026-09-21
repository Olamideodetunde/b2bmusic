'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Sparkles,
  Radio,
  Layers,
  Music,
  Gauge,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { SyncMeta } from '@/lib/db/types';

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

  const handleCopyCueSheet = () => {
    const text = `TRACK CUE SHEET DETAILS:
Title: ${trackTitle}
Composer: ${syncMeta?.composer || 'B2B Production Team'}
Publisher: ${syncMeta?.publisher || 'B2B Syncworks (BMI)'}
PRO Affiliation: ${syncMeta?.proAffiliation || 'BMI'}
ISRC: ${syncMeta?.isrc || 'N/A'}
BPM / Key: ${bpm} BPM / ${musicalKey}
Rights: 100% Master & Sync Pre-Cleared`;

    navigator.clipboard.writeText(text);
    setCopiedCueSheet(true);
    setTimeout(() => setCopiedCueSheet(false), 2500);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 my-8 space-y-8 shadow-2xl">
      {/* Editorial Overview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-crimson-400" />
            <h2 className="font-syne text-xl font-black text-white tracking-tight drop-shadow-sm">
              Production Notes &amp; Sonic Character
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-500 hidden sm:inline">
            Curated for Music Supervisors &amp; Video Editors
          </span>
        </div>
        <p className="text-zinc-300 leading-relaxed text-base">{description}</p>
      </div>

      {/* Instrumentation & Palette */}
      {syncMeta && (
        <div className="pt-6 border-t border-white/[0.08] grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5 font-mono">
              <Music className="w-3.5 h-3.5 text-crimson-400" />
              Instrumentation &amp; Key Hardware
            </h3>
            <div className="flex flex-wrap gap-2">
              {syncMeta.instrumentation.map((inst, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-obsidian-900 text-xs text-zinc-200 border border-white/10 font-mono font-medium"
                >
                  {inst}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5 font-mono">
              <Gauge className="w-3.5 h-3.5 text-crimson-400" />
              Sonic Palette &amp; Energy
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-crimson-600/15 text-xs text-crimson-300 border border-crimson-500/30 font-bold">
                Energy: {syncMeta.energyLevel}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-obsidian-900 text-xs text-zinc-200 border border-white/10 font-mono font-medium">
                {syncMeta.tempoDescriptor}
              </span>
              {syncMeta.soundPalette.map((pal, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-obsidian-900/60 text-xs text-zinc-400 border border-white/5"
                >
                  {pal}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cue Sheet Specs */}
      <div className="p-5 rounded-2xl bg-obsidian-950/80 border border-white/[0.08] shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-crimson-400" />
            <h4 className="font-syne text-sm font-bold text-white uppercase tracking-wider">
              Broadcast Sync &amp; Cue Sheet Specs
            </h4>
          </div>
          <button
            onClick={handleCopyCueSheet}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-obsidian-900 hover:bg-obsidian-800 border border-white/10 text-xs text-crimson-300 font-semibold transition-colors shadow-sm"
          >
            {copiedCueSheet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{copiedCueSheet ? 'Copied!' : 'Copy Cue Sheet'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <div className="text-zinc-500">COMPOSER:</div>
            <div className="text-zinc-200 font-bold mt-0.5">{syncMeta?.composer || 'Julian Hayes'}</div>
          </div>
          <div>
            <div className="text-zinc-500">PRO AFFILIATION:</div>
            <div className="text-zinc-200 font-bold mt-0.5">{syncMeta?.proAffiliation || 'BMI'}</div>
          </div>
          <div>
            <div className="text-zinc-500">PUBLISHER:</div>
            <div className="text-zinc-200 font-bold mt-0.5">{syncMeta?.publisher || 'B2B Sync (BMI)'}</div>
          </div>
          <div>
            <div className="text-zinc-500">ISRC:</div>
            <div className="text-crimson-400 font-bold mt-0.5">{syncMeta?.isrc || 'US-B2B-26-00101'}</div>
          </div>
        </div>
      </div>

      {/* Use Case Links */}
      {useCases.length > 0 && (
        <div className="pt-4 border-t border-white/[0.08]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 font-mono">
            Target Production Scenarios
          </h3>
          <div className="flex flex-wrap gap-2">
            {useCases.map((uc, index) => {
              const ucSlug = uc.toLowerCase().replace(/\s+/g, '-');
              return (
                <Link
                  key={index}
                  href={`/use-cases/${ucSlug}`}
                  className="px-3.5 py-1.5 rounded-xl bg-obsidian-900/80 hover:bg-crimson-600/20 text-xs font-medium text-zinc-300 hover:text-white border border-white/10 hover:border-crimson-500/40 transition-colors shadow-sm"
                >
                  {uc} &rarr;
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 3 Core Warranties */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/[0.08]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="font-syne text-sm font-bold text-white">Direct Sync Indemnity</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              100% controlled copyright. Zero secondary CMO fees, PRO collection demands, or third-party claims.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-crimson-600/15 border border-crimson-500/30 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 text-crimson-400" />
          </div>
          <div>
            <h4 className="font-syne text-sm font-bold text-white">YouTube CID Safe</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Instant channel and video whitelisting. No copyright strikes on client channels.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h4 className="font-syne text-sm font-bold text-white">Full Stems &amp; Cutdowns</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Master 24-bit/48kHz WAV, isolated stems, and :30/:60 cuts for immediate NLE timeline drop.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
