'use client';

import React, { useMemo, useState } from 'react';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import { Track } from '@/lib/db/types';
import { Container, Eyebrow, Reveal } from './primitives';
import { cn, formatDuration, rightsLabel } from '@/lib/utils';

const TABS = [
  {
    key: 'stems',
    title: 'Isolated stems',
    body: 'Drums, bass, melody and FX as separate 24-bit WAVs. Duck the drums under a voiceover without going back to the composer.',
  },
  {
    key: 'mixes',
    title: 'Alt-mixes & cutdowns',
    body: 'Underscore, drumless and :60 / :30 / :15 edits, cut on the musical phrase and ready to drop on the timeline.',
  },
  {
    key: 'cue',
    title: 'Cue sheet & clearance',
    body: 'Composer, publisher, PRO and ISRC in one copyable block. Every license ships indemnified and Content ID safe.',
  },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const LANES = ['Master', 'Drums', 'Bass', 'Melody', 'FX'];

function laneBars(seed: number) {
  return Array.from({ length: 56 }, (_, i) => Math.round(22 + ((i * 17 + seed * 29) % 60) + Math.sin(i / 3 + seed) * 12));
}

function StemsPanel({ track }: { track: Track }) {
  const [muted, setMuted] = useState<string[]>([]);
  const [solo, setSolo] = useState<string | null>(null);
  const bars = useMemo(() => LANES.map((_, i) => laneBars(i + track.id)), [track.id]);

  return (
    <div>
      <PanelHeader title={`${track.title} — Stems`} meta="24-bit / 48kHz WAV" />
      <div className="space-y-2">
        {LANES.map((lane, li) => {
          const audible = solo ? solo === lane : !muted.includes(lane);
          return (
            <div key={lane} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 h-12 px-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">{lane}</span>
              <div className={cn('flex items-center gap-[2px] h-7 transition-opacity duration-500', audible ? 'opacity-100' : 'opacity-20')}>
                {bars[li].map((h, i) => (
                  <span
                    key={i}
                    className={cn('flex-1 rounded-[1px]', li === 0 ? 'bg-crimson-500' : 'bg-zinc-400/70', audible && 'bar-playing')}
                    style={{ height: `${h}%`, transformOrigin: 'center', animationDelay: `${(i % 9) * 70 + li * 40}ms` }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMuted(m => (m.includes(lane) ? m.filter(x => x !== lane) : [...m, lane]))}
                  aria-pressed={muted.includes(lane)}
                  className={cn('w-6 h-6 rounded text-[10px] font-mono border transition-colors', muted.includes(lane) ? 'bg-zinc-200 text-obsidian-950 border-zinc-200' : 'border-white/10 text-zinc-500 hover:text-white')}
                >
                  M
                </button>
                <button
                  onClick={() => setSolo(s => (s === lane ? null : lane))}
                  aria-pressed={solo === lane}
                  className={cn('w-6 h-6 rounded text-[10px] font-mono border transition-colors', solo === lane ? 'bg-crimson-600 text-white border-crimson-600' : 'border-white/10 text-zinc-500 hover:text-white')}
                >
                  S
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MixesPanel({ track, active }: { track: Track; active: boolean }) {
  const max = Math.max(...track.altMixes.map(m => m.durationSeconds));
  return (
    <div>
      <PanelHeader title={`${track.title} — Versions`} meta={`${track.altMixes.length} deliverables`} />
      <ul className="space-y-1">
        {track.altMixes.map((mix, i) => (
          <li key={mix.id} className="grid grid-cols-[minmax(0,160px)_minmax(0,1fr)_44px] items-center gap-4 h-11 px-3 rounded-lg hover:bg-white/[0.03]">
            <span className="text-sm text-zinc-200 truncate">{mix.name}</span>
            <span className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <span
                className={cn('block h-full rounded-full origin-left transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]', i === 0 ? 'bg-crimson-500' : 'bg-zinc-400/70')}
                style={{
                  width: `${(mix.durationSeconds / max) * 100}%`,
                  transform: active ? 'scaleX(1)' : 'scaleX(0)',
                  transitionDelay: active ? `${150 + i * 90}ms` : '0ms',
                }}
              />
            </span>
            <span className="text-xs font-mono tabular-nums text-zinc-400 text-right">{formatDuration(mix.durationSeconds)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CuePanel({ track }: { track: Track }) {
  const [copied, setCopied] = useState(false);
  // The home page only renders the toolkit for a track that has cue-sheet metadata.
  const meta = track.syncMeta!;
  const rows: [string, string][] = [
    ['Title', track.title],
    ['Composer', meta.composer],
    ['Publisher', meta.publisher],
    ['PRO', meta.proAffiliation],
    ['ISRC', meta.isrc],
    ['Tempo / Key', `${track.bpm} BPM · ${track.musicalKey}`],
  ];

  const copy = () => {
    navigator.clipboard?.writeText(rows.map(([k, v]) => `${k}: ${v}`).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <PanelHeader title="Cue sheet" meta={meta.isrc} />
      <dl className="rounded-lg border border-white/[0.06] divide-y divide-white/[0.05]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 px-4 py-2.5">
            <dt className="label-xs self-center">{k}</dt>
            <dd className="text-sm font-mono text-zinc-200 truncate">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between mt-4">
        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          {rightsLabel(meta.proAffiliation)}
        </span>
        <button onClick={copy} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-white/10 text-xs text-zinc-300 hover:text-white hover:border-white/30 transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy cue sheet'}
        </button>
      </div>
    </div>
  );
}

function PanelHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <span className="text-sm font-semibold tracking-tight text-white">{title}</span>
      <span className="text-[11px] font-mono text-zinc-500">{meta}</span>
    </div>
  );
}

export function ToolkitShowcase({ track }: { track: Track }) {
  const [active, setActive] = useState<TabKey>('stems');
  const [paused, setPaused] = useState(false);

  const advance = () => {
    const i = TABS.findIndex(t => t.key === active);
    setActive(TABS[(i + 1) % TABS.length].key);
  };

  return (
    <section className="py-24 lg:py-32 border-t border-white/[0.06]">
      <Container>
        <div
          className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-12 lg:gap-20 items-center"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <Reveal>
            <Eyebrow>The toolkit</Eyebrow>
            <h2 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight leading-[1.04]">
              Every track ships as a toolkit, <span className="text-obsidian-300">not a file.</span>
            </h2>

            <div className="mt-12 border-t border-white/[0.08]" role="tablist" aria-label="Deliverables">
              {TABS.map((tab, i) => {
                const isActive = tab.key === active;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActive(tab.key)}
                    className="relative block w-full text-left py-5 border-b border-white/[0.08]"
                  >
                    <div className="flex items-baseline gap-5">
                      <span className={cn('text-xs font-mono tabular-nums transition-colors', isActive ? 'text-crimson-400' : 'text-zinc-600')}>
                        0{i + 1}
                      </span>
                      <div className="flex-1">
                        <span className={cn('text-xl font-semibold tracking-tight transition-colors duration-300', isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')}>
                          {tab.title}
                        </span>
                        <div className={cn('grid transition-[grid-template-rows,opacity] duration-500 ease-out', isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                          <p className="overflow-hidden text-sm text-zinc-400 leading-relaxed max-w-md">
                            <span className="block pt-2">{tab.body}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Auto-advance progress */}
                    {isActive && (
                      <span
                        key={active}
                        onAnimationEnd={advance}
                        className="absolute left-0 -bottom-px h-px w-full bg-crimson-500 origin-left motion-safe:animate-progress"
                        style={{ animationDuration: '6s', animationPlayState: paused ? 'paused' : 'running' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative rounded-2xl border border-white/[0.08] bg-obsidian-900/40 p-5 sm:p-7 min-h-[430px] shadow-2xl shadow-black/40">
              {TABS.map(tab => (
                <div
                  key={tab.key}
                  aria-hidden={tab.key !== active}
                  className={cn(
                    'transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
                    tab.key === active
                      ? 'relative opacity-100 translate-y-0'
                      : 'absolute inset-5 sm:inset-7 opacity-0 translate-y-3 pointer-events-none',
                  )}
                >
                  {tab.key === 'stems' && <StemsPanel track={track} />}
                  {tab.key === 'mixes' && <MixesPanel track={track} active={active === 'mixes'} />}
                  {tab.key === 'cue' && <CuePanel track={track} />}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
