import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getTrackBySlug, getAllTracks, getTracksByGenre } from '@/lib/db';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import { BadgeCluster } from '@/components/track/BadgeCluster';
import { DescriptionBlock } from '@/components/track/DescriptionBlock';
import { CheckoutCTA } from '@/components/track/CheckoutCTA';
import { SchemaJsonLd } from '@/components/track/SchemaJsonLd';
import { TrackCard } from '@/components/hub/TrackCard';
import Link from 'next/link';
import { ChevronRight, Radio } from 'lucide-react';
import { getSiteUrl } from '@/lib/utils';

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

  const title = `${track.title} | ${track.targetKeyword} (Commercial Sync License)`;
  const description = `${track.description.slice(0, 155)}... 100% pre-cleared sync license with master WAV and stems.`;

  const coverUrl = track.coverImageUrl
    ? (track.coverImageUrl.startsWith('http') ? track.coverImageUrl : `${siteUrl}${track.coverImageUrl.startsWith('/') ? '' : '/'}${track.coverImageUrl}`)
    : `${siteUrl}/images/default-track-og.jpg`;

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/tracks/${track.slug}` },
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

  const relatedTracks = (await getTracksByGenre(track.genre))
    .filter((t) => t.id !== track.id)
    .slice(0, 3);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full max-w-[1700px] mx-auto text-white relative">
      <SchemaJsonLd track={track} siteUrl={siteUrl} />

      {/* Ambient background glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-crimson-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400 mb-6 font-mono">
        <Link href="/" className="hover:text-crimson-400 transition-colors font-medium">Catalog</Link>
        <ChevronRight className="w-3 h-3 text-zinc-600" />
        <Link
          href={`/genres/${track.genre.toLowerCase().replace(/\s+/g, '-')}`}
          className="hover:text-crimson-400 transition-colors font-medium"
        >
          {track.genre}
        </Link>
        <ChevronRight className="w-3 h-3 text-zinc-600" />
        <span className="text-zinc-200 font-semibold truncate max-w-xs">{track.title}</span>
      </nav>

      {/* Hero Header with Frosted Glass Chassis & Cover Art */}
      <div className="relative rounded-3xl p-6 sm:p-8 glass-panel border border-white/10 mb-8 overflow-hidden shadow-2xl backdrop-blur-2xl">
        {/* Subtle background glow element */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-crimson-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center">
          {/* Cover Art Thumbnail */}
          {track.coverImageUrl ? (
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shrink-0 border border-white/20 shadow-2xl shadow-crimson-950/60 relative group ring-1 ring-white/10">
              <img
                src={track.coverImageUrl}
                alt={track.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950/80 via-transparent to-transparent pointer-events-none" />
            </div>
          ) : (
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-obsidian-900 border border-white/10 flex items-center justify-center shrink-0 shadow-xl">
              <span className="font-mono font-bold text-crimson-500 text-lg tracking-wider">HQ WAV</span>
            </div>
          )}

          {/* Title & Metadata Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-crimson-950/60 text-crimson-300 border border-crimson-800/60 shadow-sm backdrop-blur-md">
                <Radio className="w-3.5 h-3.5 animate-pulse text-crimson-400" />
                <span>Intent: &ldquo;{track.targetKeyword}&rdquo;</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Direct Sync 100% Cleared</span>
              </div>
            </div>

            <h1 className="font-syne text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {track.title}
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed font-jakarta">
              Master commercial synchronization track tailored for {(track.useCases || []).slice(0, 3).join(', ')}. Includes full stems and broadcast cutdowns.
            </p>

            <BadgeCluster
              bpm={track.bpm}
              musicalKey={track.musicalKey}
              genre={track.genre}
              moods={track.moods || []}
            />
          </div>
        </div>
      </div>

      {/* ─── 2-COLUMN STUDIO WORKSPACE (MUSICBED & PREMIUMBEAT STANDARD) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (8 cols): Audio Deck, Deliverable Stems, Production Notes, Cue Sheet */}
        <div className="lg:col-span-8 space-y-8">
          {/* Interactive Waveform Audio Player Deck */}
          <AudioPlayer track={track} />

          {/* Description / Broadcast Cue Sheet / Sync Specs */}
          <DescriptionBlock
            description={track.description}
            useCases={track.useCases}
            targetKeyword={track.targetKeyword}
            syncMeta={track.syncMeta}
            trackTitle={track.title}
            bpm={track.bpm}
            musicalKey={track.musicalKey}
          />

          {/* Related Tracks */}
          {relatedTracks.length > 0 && (
            <section className="pt-6 border-t border-white/10">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-syne text-xl font-bold text-white">More in {track.genre}</h3>
                  <p className="text-xs text-zinc-400">Similar commercial cleared tracks for your production</p>
                </div>
                <Link
                  href={`/genres/${track.genre.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-xs font-semibold text-crimson-400 hover:text-crimson-300 transition-colors flex items-center gap-1"
                >
                  <span>View all {track.genre}</span>
                  <span>&rarr;</span>
                </Link>
              </div>
              <div className="space-y-3">
                {relatedTracks.map((rel) => (
                  <TrackCard key={rel.id} track={rel} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN (4 cols): Sticky Licensing & Checkout Chassis */}
        <div className="lg:col-span-4 sticky top-24 space-y-6">
          <CheckoutCTA track={track} layout="sidebar" />
        </div>
      </div>
    </div>
  );
}
