import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Container } from '@/components/home/primitives';

export interface HubEntry {
  href: string;
  name: string;
  count: number;
  summary: string;
}

/** Card grid linking to every hub of one kind (genres, use cases, tempos). */
export function HubDirectory({ entries }: { entries: HubEntry[] }) {
  return (
    <section className="py-12 lg:py-16">
      <Container>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {entries.map(e => (
            <li key={e.href}>
              <Link
                href={e.href}
                className="group flex h-full flex-col rounded-xl border border-white/[0.08] bg-navy-900/40 p-5 transition-colors hover:border-brand-500/50 hover:bg-navy-900/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-tight text-white">{e.name}</h2>
                  <ArrowUpRight className="w-4 h-4 shrink-0 text-slate-500 transition-all group-hover:text-brand-400 group-hover:rotate-45" aria-hidden />
                </div>
                <p className="mt-1 text-[11px] font-mono uppercase tracking-wider text-gold-400">
                  {e.count} {e.count === 1 ? 'track' : 'tracks'}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{e.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
