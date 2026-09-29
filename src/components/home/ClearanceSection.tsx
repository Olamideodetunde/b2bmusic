import React from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { Container, Eyebrow, Reveal, ArrowLink } from './primitives';

const POINTS = [
  {
    title: 'One-stop master & publishing',
    body: 'We control 100% of both sides, so one license clears the recording and the composition.',
  },
  {
    title: 'YouTube Content ID whitelisting',
    body: 'Your license is registered automatically — no claims or strikes on client channels.',
  },
  {
    title: 'No PRO or CMO surprise invoices',
    body: 'Direct sync agreements with no secondary collection society fees after delivery.',
  },
  {
    title: 'Worldwide and perpetual',
    body: 'Cleared for broadcast, OTT, cinema and online in every territory, forever.',
  },
];

export function ClearanceSection() {
  return (
    <section className="py-24 lg:py-32 border-t border-white/[0.06]">
      <Container>
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-24 items-center">
          <Reveal className="relative">
            <figure className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] rounded-2xl overflow-hidden border border-white/[0.06]">
              <img
                src="/banners/banner-paris-concert.jpg"
                alt="Concert crowd in front of a lit stage"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover grayscale contrast-[1.15] brightness-[0.6]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-obsidian-950/10 to-transparent" />
              <figcaption className="absolute left-6 right-6 bottom-6 text-sm text-zinc-300 max-w-xs leading-relaxed">
                Cleared for broadcast, streaming and live events — in every territory.
              </figcaption>
            </figure>

            {/* Floating certificate */}
            <div className="absolute -right-3 sm:-right-6 top-10 w-60 rounded-xl border border-white/10 bg-obsidian-950/85 backdrop-blur-xl p-4 shadow-2xl shadow-black/60">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[11px] font-mono uppercase tracking-wider">License verified</span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                {['Master rights', 'Publishing rights', 'Content ID'].map(item => (
                  <div key={item} className="flex items-center justify-between text-zinc-400">
                    <span>{item}</span>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <Eyebrow>Clearance</Eyebrow>
              <h2 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight leading-[1.04]">
                Cleared once. <span className="text-obsidian-300">Covered everywhere.</span>
              </h2>
              <p className="mt-5 text-base text-zinc-400 leading-relaxed max-w-lg">
                Legal review shouldn&apos;t be the slowest part of the edit. Every track is pre-cleared before it
                reaches the catalog.
              </p>
            </Reveal>

            <div className="mt-10 border-t border-white/[0.08]">
              {POINTS.map((p, i) => (
                <Reveal key={p.title} delay={i * 80}>
                  <div className="group flex gap-5 py-5 border-b border-white/[0.08]">
                    <span className="mt-1 w-5 h-5 shrink-0 rounded-full border border-crimson-500/40 flex items-center justify-center transition-colors duration-500 group-hover:bg-crimson-600 group-hover:border-crimson-600">
                      <Check className="w-3 h-3 text-crimson-400 group-hover:text-white transition-colors" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight font-jakarta text-white">{p.title}</h3>
                      <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{p.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={200} className="mt-8">
              <ArrowLink href="/pricing">How licensing works</ArrowLink>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
