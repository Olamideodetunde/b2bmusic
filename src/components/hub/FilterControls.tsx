'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Toolbar trigger + anchored panel; closes on outside click / Escape. */
export function FilterPopover({
  label,
  value,
  active,
  children,
  align = 'left',
  panelClassName,
}: {
  label: string;
  value?: string;
  active: boolean;
  children: React.ReactNode;
  align?: 'left' | 'right';
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-md border text-xs transition-colors whitespace-nowrap',
          active
            ? 'border-brand-500/50 bg-brand-600/10 text-brand-200'
            : 'border-white/[0.08] text-slate-300 hover:border-white/20 hover:text-white',
          open && !active && 'border-white/20 text-white',
        )}
      >
        <span className="font-medium">{label}</span>
        {value && <span className={cn('font-mono tabular-nums text-[11px]', active ? 'text-brand-300' : 'text-slate-500')}>{value}</span>}
        <ChevronDown className={cn('w-3 h-3 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={`${label} filter`}
          className={cn(
            'absolute top-full mt-1 z-30 rounded-md bg-navy-850 border border-white/10 shadow-xl shadow-black/60',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** Multi-select checklist used for genre / mood / energy facets. */
export function CheckList({
  options,
  selected,
  onToggle,
  counts,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  counts?: Record<string, number>;
}) {
  return (
    <ul className="py-1 max-h-72 overflow-y-auto min-w-[200px]">
      {options.map(opt => {
        const checked = selected.includes(opt);
        return (
          <li key={opt}>
            <button
              onClick={() => onToggle(opt)}
              role="checkbox"
              aria-checked={checked}
              className="flex items-center gap-2 w-full h-7 px-2.5 text-xs text-left text-slate-300 hover:bg-white/[0.06] hover:text-white"
            >
              <span
                className={cn(
                  'w-3.5 h-3.5 rounded-sm border inline-flex items-center justify-center shrink-0',
                  checked ? 'bg-brand-600 border-brand-500 text-white' : 'border-navy-500',
                )}
              >
                {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <span className="flex-1 truncate">{opt}</span>
              {counts && <span className="text-[10px] font-mono tabular-nums text-slate-500">{counts[opt] ?? 0}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Inline segmented control. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex items-center h-7 rounded-md border border-white/[0.08] p-0.5" role="radiogroup" aria-label={label}>
      {options.map(opt => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-2 h-full rounded-[4px] text-[11px] font-medium whitespace-nowrap transition-colors',
            value === opt.value ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-200',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Two-thumb range built from stacked native inputs (keyboard accessible). */
export function DualRange({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}) {
  const [lo, hi] = value;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div className="relative h-5">
      <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1 rounded-full bg-navy-700" />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-brand-600"
        style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={lo}
        onChange={(e) => onChange([Math.min(Number(e.target.value), hi - 1), hi])}
        className="range-dual absolute inset-0 w-full h-full"
        aria-label="Minimum BPM"
      />
      <input
        type="range"
        min={min}
        max={max}
        value={hi}
        onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo + 1)])}
        className="range-dual absolute inset-0 w-full h-full"
        aria-label="Maximum BPM"
      />
    </div>
  );
}
