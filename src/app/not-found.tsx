import React from 'react';
import { Container, Eyebrow, PrimaryButton, GhostButton } from '@/components/home/primitives';
import { CoverImage } from '@/components/ui/CoverImage';

export default function NotFound() {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <CoverImage fill src="/banners/banner-monochrome-club.jpg" alt="" className="object-cover grayscale brightness-[0.3]" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/50" />

      <Container className="relative py-32 lg:py-44">
        <Eyebrow className="enter-up">Error 404</Eyebrow>
        <h1
          className="enter-up mt-6 text-5xl sm:text-7xl font-bold tracking-[-0.035em] leading-[0.98]"
          style={{ '--enter-delay': '80ms' } as React.CSSProperties}
        >
          This cue <span className="text-navy-300">didn&apos;t make the edit.</span>
        </h1>
        <p
          className="enter-up mt-6 max-w-md text-base text-slate-400 leading-relaxed"
          style={{ '--enter-delay': '160ms' } as React.CSSProperties}
        >
          The page you&apos;re looking for has moved or no longer exists. The catalog is still right where you left it.
        </p>
        <div className="enter-up mt-10 flex flex-wrap gap-3" style={{ '--enter-delay': '240ms' } as React.CSSProperties}>
          <PrimaryButton href="/#catalog">Browse the catalog</PrimaryButton>
          <GhostButton href="/">Back to home</GhostButton>
        </div>
      </Container>
    </section>
  );
}
