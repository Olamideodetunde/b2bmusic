import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Track } from '@/lib/db/types';
import { Container, Reveal, SectionHeading, ArrowLink } from './primitives';
import { cn, toSlug } from '@/lib/utils';
import { genreImage } from '@/lib/imagery';
import { CoverImage } from '@/components/ui/CoverImage';

interface Collection {
  genre: string;
  title: string;
  description: string;
  /** Bento placement on md+ */
  span: string;
}

const COLLECTIONS: Collection[] = [
  {
    genre: 'Cinematic',
    title: 'Cinematic & Documentary',
    description: 'Hybrid percussion, live strings and sub-bass for trailers and long-form film.',
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    genre: 'Electronic',
    title: 'Electronic & Brand',
    description: 'Four-on-the-floor momentum with edit points at :15, :30 and :60.',
    span: 'md:col-span-2',
  },
  {
    genre: 'Corporate / Tech',
    title: 'Corporate & Tech',
    description: 'Clean, voiceover-safe beds for explainers, keynotes and podcasts.',
    span: 'md:col-span-1',
  },
  {
    genre: 'Folk & Acoustic',
    title: 'Acoustic & Lifestyle',
    description: 'Organic guitars and stomps for warm brand stories.',
    span: 'md:col-span-1',
  },
];

export function CuratedCollections({ tracks }: { tracks: Track[] }) {
  const statsFor = (genre: string) => {
    const inGenre = tracks.filter(t => t.genre === genre);
    const bpms = inGenre.map(t => t.bpm);
    const range = bpms.length ? (Math.min(...bpms) === Math.max(...bpms) ? `${bpms[0]}` : `${Math.min(...bpms)}–${Math.max(...bpms)}`) : '—';
    return { count: inGenre.length, range };
  };

  return (
    <section className="py-24 lg:py-32">
      <Container>
        <SectionHeading
          eyebrow="Collections"
          title={<>Curated for <span className="text-navy-300">the edit.</span></>}
          description="Start from a mood, not a search box. Each collection is sequenced by music supervisors for a specific kind of timeline."
          aside={<ArrowLink href="/#catalog">Browse the full catalog</ArrowLink>}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-3 md:h-[600px]">
          {COLLECTIONS.filter(col => tracks.some(t => t.genre === col.genre)).map((col, i) => {
            const { count, range } = statsFor(col.genre);
            return (
              <Reveal key={col.title} delay={i * 90} className={cn('h-72 md:h-auto', col.span)}>
                <Link
                  href={`/genres/${toSlug(col.genre)}`}
                  className="group relative block h-full overflow-hidden rounded-xl border border-white/[0.06] bg-navy-900"
                >
                  <CoverImage
                    fill
                    src={genreImage(col.genre)}
                    alt=""
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover grayscale brightness-[0.55] contrast-[1.1] transition-[filter,transform] duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:grayscale-0 group-hover:brightness-[0.7] group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/30 to-transparent" />

                  <span className="absolute top-5 right-5 w-10 h-10 rounded-full border border-white/20 bg-black/30 backdrop-blur-md flex items-center justify-center text-white transition-all duration-500 group-hover:bg-brand-600 group-hover:border-brand-600">
                    <ArrowUpRight className="w-4 h-4 transition-transform duration-500 group-hover:rotate-45" />
                  </span>

                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <div className="text-[11px] font-mono tabular-nums uppercase tracking-wider text-slate-400">
                      {count} {count === 1 ? 'track' : 'tracks'} · {range} BPM
                    </div>
                    <h3 className={cn('mt-2 font-bold tracking-tight', i === 0 ? 'text-3xl' : 'text-xl')}>{col.title}</h3>
                    <p
                      className={cn(
                        'text-sm text-slate-300 leading-relaxed max-w-sm transition-all duration-500',
                        i === 0 ? 'mt-3' : 'mt-2 md:max-h-0 md:opacity-0 md:group-hover:max-h-20 md:group-hover:opacity-100',
                      )}
                    >
                      {col.description}
                    </p>
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
