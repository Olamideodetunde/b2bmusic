import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container, Reveal, SectionHeading, ArrowLink } from './primitives';
import { cn } from '@/lib/utils';

import { LICENSE_TIERS, type LicenseTierKey } from '@/lib/licensing';

/** `fromPrices` = lowest price per tier in the live catalog (formatted), passed by the home page. */
export function PricingTeaser({ fromPrices }: { fromPrices: Record<LicenseTierKey, string> }) {
  const TIERS = LICENSE_TIERS.map(t => ({ key: t.key, price: fromPrices[t.key], label: `${t.name} · ${t.label}`, body: t.summary, featured: t.key === 'commercial' }));
  return (
    <section className="py-24 lg:py-32 border-t border-white/[0.06]">
      <Container>
        <SectionHeading
          eyebrow="Licensing"
          title={<>One track. One fee. <span className="text-obsidian-300">Yours to keep.</span></>}
          description="Per-track perpetual licenses. No subscription, no renewal dates, no usage audits."
          aside={<ArrowLink href="/pricing">Compare all rights</ArrowLink>}
        />

        <div className="grid md:grid-cols-3 border border-white/[0.08] rounded-2xl overflow-hidden">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.label} delay={i * 100} className={cn(i > 0 && 'border-t md:border-t-0 md:border-l border-white/[0.08]')}>
              <Link
                href="/pricing"
                className={cn(
                  'group relative flex flex-col h-full p-8 lg:p-10 transition-colors duration-500',
                  tier.featured ? 'bg-crimson-600/[0.06] hover:bg-crimson-600/[0.1]' : 'hover:bg-white/[0.02]',
                )}
              >
                {tier.featured && <span className="absolute inset-x-0 top-0 h-px bg-crimson-500" />}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-300">{tier.label}</span>
                  {tier.featured && <span className="text-[10px] font-mono uppercase tracking-wider text-crimson-400">Most chosen</span>}
                </div>
                <div className="mt-8 flex items-baseline gap-2">
                  <span className="text-xs font-mono text-zinc-500">From</span>
                  <span className="text-5xl font-mono font-medium tabular-nums tracking-tight text-white">{tier.price}</span>
                  <span className="text-xs font-mono text-zinc-500">/ track</span>
                </div>
                <p className="mt-4 text-sm text-zinc-400 leading-relaxed">{tier.body}</p>
                <span className="mt-10 inline-flex items-center gap-1.5 text-sm text-zinc-300 group-hover:text-white transition-colors">
                  See what&apos;s included
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
