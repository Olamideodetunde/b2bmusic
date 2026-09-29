'use client';

import React from 'react';

// Key name for each Camelot slot (index 0 = position 1)
const MAJOR_NAMES = ['B', 'F#', 'D♭', 'A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E'];
const MINOR_NAMES = ['G#m', 'D#m', 'B♭m', 'Fm', 'Cm', 'Gm', 'Dm', 'Am', 'Em', 'Bm', 'F#m', 'C#m'];

export function camelotName(code: string): string {
  const n = parseInt(code, 10);
  if (!n) return code;
  return code.endsWith('B') ? MAJOR_NAMES[n - 1] : MINOR_NAMES[n - 1];
}

/** Adjacent keys on the wheel that mix harmonically with `code` (±1, relative major/minor). */
export function compatibleKeys(code: string): string[] {
  const n = parseInt(code, 10);
  const ring = code.slice(-1);
  const other = ring === 'A' ? 'B' : 'A';
  const wrap = (v: number) => ((v - 1 + 12) % 12) + 1;
  return [code, `${wrap(n - 1)}${ring}`, `${wrap(n + 1)}${ring}`, `${n}${other}`];
}

const SIZE = 208;
const C = SIZE / 2;
const RINGS = {
  B: { inner: 66, outer: 100 }, // major — outer ring
  A: { inner: 34, outer: 66 },  // minor — inner ring
};

const polar = (r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
};

function segmentPath(inner: number, outer: number, a0: number, a1: number) {
  const [x0, y0] = polar(outer, a0);
  const [x1, y1] = polar(outer, a1);
  const [x2, y2] = polar(inner, a1);
  const [x3, y3] = polar(inner, a0);
  return `M${x0},${y0} A${outer},${outer} 0 0 1 ${x1},${y1} L${x2},${y2} A${inner},${inner} 0 0 0 ${x3},${y3} Z`;
}

interface CamelotWheelProps {
  selected: string[];
  /** Codes that exist in the current catalog (rendered brighter). */
  available: Set<string>;
  onToggle: (code: string) => void;
}

export function CamelotWheel({ selected, available, onToggle }: CamelotWheelProps) {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="block select-none" role="group" aria-label="Camelot key wheel">
      {(['B', 'A'] as const).map(ring =>
        Array.from({ length: 12 }, (_, i) => {
          const n = i + 1;
          const code = `${n}${ring}`;
          const mid = -90 + n * 30; // 12 sits at the top
          const { inner, outer } = RINGS[ring];
          const isSelected = selected.includes(code);
          const inCatalog = available.has(code);
          const [lx, ly] = polar((inner + outer) / 2, mid);
          return (
            <g
              key={code}
              onClick={() => onToggle(code)}
              className="cursor-pointer group/seg"
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`${code} ${camelotName(code)}`}
            >
              <title>{`${code} · ${camelotName(code)}${inCatalog ? '' : ' (no tracks)'}`}</title>
              <path
                d={segmentPath(inner, outer, mid - 15, mid + 15)}
                className={
                  isSelected
                    ? 'fill-brand-600 stroke-navy-950'
                    : inCatalog
                      ? 'fill-navy-700 stroke-navy-950 group-hover/seg:fill-navy-600'
                      : 'fill-navy-850 stroke-navy-950 group-hover/seg:fill-navy-800'
                }
                strokeWidth={1.5}
              />
              <text
                x={lx}
                y={ly - 3}
                textAnchor="middle"
                dominantBaseline="middle"
                className={isSelected ? 'fill-white' : inCatalog ? 'fill-slate-200' : 'fill-navy-400'}
                style={{ fontSize: 9, fontFamily: 'var(--font-jetbrains), monospace', fontWeight: 600 }}
              >
                {code}
              </text>
              <text
                x={lx}
                y={ly + 7}
                textAnchor="middle"
                dominantBaseline="middle"
                className={isSelected ? 'fill-brand-100' : 'fill-navy-400'}
                style={{ fontSize: 7, fontFamily: 'var(--font-jetbrains), monospace' }}
              >
                {camelotName(code)}
              </text>
            </g>
          );
        }),
      )}
      <circle cx={C} cy={C} r={RINGS.A.inner - 2} className="fill-navy-950" />
      <text x={C} y={C - 5} textAnchor="middle" className="fill-navy-400" style={{ fontSize: 8, fontFamily: 'var(--font-jetbrains), monospace' }}>
        B MAJ
      </text>
      <text x={C} y={C + 7} textAnchor="middle" className="fill-navy-400" style={{ fontSize: 8, fontFamily: 'var(--font-jetbrains), monospace' }}>
        A MIN
      </text>
    </svg>
  );
}
