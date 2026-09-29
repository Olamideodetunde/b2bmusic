import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Track } from '@/lib/db/types';
import { Container, Reveal, Eyebrow } from '@/components/home/primitives';
import { genreImage } from '@/lib/imagery';
import { toSlug } from '@/lib/utils';
import { CoverImage } from '@/components/ui/CoverImage';

interface GenreTilesProps {
  tracks: Track[];
  /** Genre to leave out (the page you're on). */
  exclude?: string;
  title?: string;
}

/** Compact image tiles linking to genre hubs — keeps hub pages from dead-ending. */
export function GenreTiles({ tracks, exclude, title = 'Browse other genres' }: GenreTilesProps) {
  const genres = Array.from(new Set(tracks.map(t => t.genre)))
    .filter(g => g !== exclude)
    .sort();

  if (genres.length === 0) return null;

  return (
    <section className="py-20 lg:py-24 border-t border-white/[0.06]">
      <Container>
        <Reveal>
          <Eyebrow>Keep exploring</Eyebrow>
          <h2 className="mt-5 mb-10 text-3xl sm:text-4xl font-bold tracking-tight">{title}</h2>
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {genres.map((genre, i) => {
            const count = tracks.filter(t => t.genre === genre).length;
            return (
              <Reveal key={genre} delay={i * 60}>
                <Link
                  href={`/genres/${toSlug(genre)}`}
                  className="group relative block aspect-[4/5] overflow-hidden rounded-xl border border-white/[0.06] bg-navy-900"
                >
                  <CoverImage
                    fill
                    src={genreImage(genre)}
                    alt=""
                    sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 50vw"
                    className="object-cover grayscale brightness-[0.5] transition-[filter,transform] duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:grayscale-0 group-hover:brightness-[0.65] group-hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/20 to-transparent" />
                  <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-slate-400 transition-all duration-500 group-hover:text-white group-hover:rotate-45" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      {count} {count === 1 ? 'track' : 'tracks'}
                    </div>
                    <div className="mt-1 text-base font-semibold tracking-tight text-white">{genre}</div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
