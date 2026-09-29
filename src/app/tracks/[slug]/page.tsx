import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getTrackBySlug, getAllTracks, getTracksByGenre, getTracksByBpmBand } from '@/lib/db';
import { bpmBandFor } from '@/lib/catalog/taxonomy';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import { BadgeCluster } from '@/components/track/BadgeCluster';
import { DescriptionBlock } from '@/components/track/DescriptionBlock';
import { CheckoutCTA } from '@/components/track/CheckoutCTA';
import { SchemaJsonLd } from '@/components/track/SchemaJsonLd';
import { TrackTable } from '@/components/hub/TrackTable';
import Link from 'next/link';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import { Container, Eyebrow } from '@/components/home/primitives';
import { formatDuration, getSiteUrl, parseMusicalKey, toSlug } from '@/lib/utils';

interface PageProps {
  params: { slug: string };
}

// Incremental Static Regeneration (ISR) configuration
export const revalidate = 3600;

export async function generateStaticParams() {
  const tracks = await getAllTracks();
  return tracks.map((track) => ({ slug: track.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const track = await getTrackBySlug(params.slug);
  const siteUrl = getSiteUrl();

  if (!track) return { title: 'Track Not Found' };

  const title = `${track.title} | ${track.targetKeyword || track.title} (Commercial Sync License)`;
  const description = `${(track.description || '').slice(0, 155)}... 100% pre-cleared sync license with master WAV and stems.`;

  const coverUrl = track.coverImageUrl
    ? (track.coverImageUrl.startsWith('http') ? track.coverImageUrl : `${siteUrl}${track.coverImageUrl.startsWith('/') ? '' : '/'}${track.coverImageUrl}`)
    : `${siteUrl}/images/default-track-og.jpg`;

  const keywords = [
    track.targetKeyword,
    track.title,
    track.genre,
    ...(track.moods || []),
    ...(track.useCases || []),
    'commercial sync license',
    'royalty free production music',
    'stems download'
  ];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `${siteUrl}/tracks/${track.slug}` },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/tracks/${track.slug}`,
      siteName: 'B2B Production Music',
      type: 'music.song',
      images: [{ url: coverUrl, width: 1200, height: 630, alt: track.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [coverUrl],
    },
  };
}

export default async function TrackLandingPage({ params }: PageProps) {
  const track = await getTrackBySlug(params.slug);
  const siteUrl = getSiteUrl();

  if (!track) notFound();

  const band = bpmBandFor(track.bpm);

  // Same genre first, then same tempo band — keeps every page linked into the catalog.
  const sameGenre = (await getTracksByGenre(track.genre)).filter(t => t.id !== track.id);
  const sameTempo = (await getTracksByBpmBand(band)).filter(t => t.id !== track.id && !sameGenre.some(g => g.id === t.id));
  const relatedTracks = [...sameGenre, ...sameTempo].slice(0, 4);

  const key = parseMusicalKey(track.musicalKey);
  const genreHref = `/genres/${toSlug(track.genre)}`;

  const stats: { value: string; label: string; href?: string }[] = [
    { value: String(track.bpm), label: `BPM · ${band.short}`, href: `/bpm/${band.slug}` },
    { value: key.camelot ? `${key.camelot} · ${key.short}` : key.short, label: track.musicalKey },
    { value: formatDuration(track.durationSeconds), label: 'Duration' },
    ...(track.altMixes && track.altMixes.length > 0 ? [{ value: String(track.altMixes.length), label: 'Alt-mixes' }] : []),
    ...(track.stems && track.stems.length > 0 ? [{ value: String(track.stems.length), label: 'Stems' }] : []),
  ];

  const card = 'rounded-2xl border border-white/[0.08] bg-obsidian-900/30';

  return (
    <div>
      <SchemaJsonLd track={track} siteUrl={siteUrl} />

      {/* ─── Track header ─── */}
      <header className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Ambient backdrop from the track's own artwork */}
        {track.coverImageUrl && (
          <div className="absolute inset-0" aria-hidden>
            <img src={track.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-30 saturate-[0.8]" />
            <div className="absolute inset-0 bg-gradient-to-b from-obsidian-950/40 via-obsidian-950/70 to-obsidian-950" />
          </div>
        )}

        <Container className="relative pt-10 pb-12 lg:pt-14 lg:pb-14">
          <nav aria-label="Breadcrumb" className="enter-up flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 mb-10">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3 text-obsidian-500" />
            <Link href={genreHref} className="hover:text-white transition-colors">{track.genre}</Link>
            <ChevronRight className="w-3 h-3 text-obsidian-500" />
            <span className="text-zinc-300 truncate max-w-xs">{track.title}</span>
          </nav>

          <div className="flex flex-col sm:flex-row gap-8 lg:gap-10 sm:items-end">
            {track.coverImageUrl ? (
              <img
                src={track.coverImageUrl}
                alt={`${track.title} cover artwork`}
                width={208}
                height={208}
                decoding="async"
                className="enter-up w-40 h-40 lg:w-52 lg:h-52 rounded-xl object-cover border border-white/10 shadow-2xl shadow-black/60 shrink-0"
              />
            ) : (
              <div className="w-40 h-40 lg:w-52 lg:h-52 rounded-xl bg-obsidian-900 border border-white/10 flex items-center justify-center shrink-0">
                <span className="font-mono text-xs font-bold text-crimson-500">WAV</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <Eyebrow className="enter-up">
                <Link href={genreHref} className="hover:text-white transition-colors">{track.genre}</Link>
              </Eyebrow>
              <h1
                className="enter-up mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.03em] leading-[1.02]"
                style={{ '--enter-delay': '80ms' } as React.CSSProperties}
              >
                {track.title}
              </h1>
              {track.syncMeta?.composer && (
                <p className="enter-up mt-3 text-base text-zinc-400" style={{ '--enter-delay': '140ms' } as React.CSSProperties}>
                  by <span className="text-zinc-200">{track.syncMeta.composer}</span>
                </p>
              )}
              <div className="enter-up" style={{ '--enter-delay': '200ms' } as React.CSSProperties}>
                <BadgeCluster
                  bpm={track.bpm}
                  musicalKey={track.musicalKey}
                  genre={track.genre}
                  moods={track.moods || []}
                  proAffiliation={track.syncMeta?.proAffiliation}
                  energyLevel={track.syncMeta?.energyLevel}
                />
              </div>
            </div>
          </div>

          <dl
            className="enter-up mt-10 pt-6 border-t border-white/[0.08] grid grid-cols-2 sm:flex sm:flex-wrap gap-x-12 gap-y-5"
            style={{ '--enter-delay': '260ms' } as React.CSSProperties}
          >
            {stats.map(s => {
              const content = (
                <>
                  <span className="block text-2xl font-mono font-medium tabular-nums text-white">{s.value}</span>
                  <span className="block text-xs text-zinc-500 mt-1 group-hover:text-crimson-400 transition-colors">{s.label}{s.href && ' →'}</span>
                </>
              );
              return (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd>{s.href ? <Link href={s.href} className="group block">{content}</Link> : content}</dd>
                </div>
              );
            })}
          </dl>
        </Container>
      </header>

      {/* ─── Deck + details | licensing ─── */}
      <Container className="py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-8 items-start">
          <div className="min-w-0 space-y-6">
            <div className={`${card} overflow-hidden`}>
              <AudioPlayer track={track} />
            </div>

            <div className={`${card} overflow-hidden`}>
              <DescriptionBlock
                description={track.description}
                useCases={track.useCases}
                targetKeyword={track.targetKeyword}
                syncMeta={track.syncMeta}
                trackTitle={track.title}
                bpm={track.bpm}
                musicalKey={track.musicalKey}
              />
            </div>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className={card}>
              <CheckoutCTA track={track} layout="sidebar" />
            </div>
          </aside>
        </div>

        {relatedTracks.length > 0 && (
          <section className="mt-16 lg:mt-20">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <Eyebrow>Keep auditioning</Eyebrow>
                <h2 className="mt-4 text-3xl font-bold tracking-tight">
                  {sameTempo.length === 0 ? `More in ${track.genre}` : 'Similar genre & tempo'}
                </h2>
              </div>
              <div className="flex items-center gap-5">
                <Link href={genreHref} className="group inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors">
                  {track.genre} <ArrowUpRight className="w-4 h-4 transition-transform group-hover:rotate-45" />
                </Link>
                <Link href={`/bpm/${band.slug}`} className="group inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors">
                  {band.label} <ArrowUpRight className="w-4 h-4 transition-transform group-hover:rotate-45" />
                </Link>
              </div>
            </div>
            <div className={card}>
              <TrackTable tracks={relatedTracks} className="border-y-0" />
            </div>
          </section>
        )}
      </Container>
    </div>
  );
}
