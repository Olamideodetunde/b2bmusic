import React from 'react';
import { Container, Reveal, PrimaryButton, GhostButton } from './primitives';
import { mailto } from '@/lib/brand';
import { CoverImage } from '@/components/ui/CoverImage';

export function ClosingCta() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06]">
      <CoverImage fill src="/banners/banner-red-blur.jpg" alt="" className="object-cover object-[50%_55%] brightness-[0.35] saturate-[0.9]" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950 via-navy-950/40 to-navy-950" />

      <Container className="relative py-32 lg:py-44 text-center">
        <Reveal>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.035em] leading-[1]">
            Find the track
            <br />
            <span className="text-navy-300">before the deadline.</span>
          </h2>
        </Reveal>
        <Reveal delay={150}>
          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-md mx-auto leading-relaxed">
            Audition, shortlist and license in minutes — with stems and paperwork included.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <PrimaryButton href="/#catalog">Start auditioning</PrimaryButton>
            <GhostButton href={mailto('Enterprise Licensing Inquiry')}>
              Talk to licensing
            </GhostButton>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
