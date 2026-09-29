import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getAllTracks, getTracksByBpmBand } from '@/lib/db';
import { BPM_BANDS, findBpmBand } from '@/lib/catalog/taxonomy';
import { CatalogExplorer } from '@/components/hub/CatalogExplorer';
import { PageHeader } from '@/components/navigation/PageHeader';
import { GenreTiles } from '@/components/hub/GenreTiles';
import { Container } from '@/components/home/primitives';
import { catalogStats, getSiteUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface BpmPageProps {
  params: { band: string };
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const tracks = await getAllTracks();
  return BPM_BANDS.filter(b => tracks.some(t => t.bpm >= b.min && t.bpm <= b.max)).map(b => ({ band: b.slug }));
}

export async function generateMetadata({ params }: BpmPageProps): Promise<Metadata> {
  const band = findBpmBand(params.band);
  if (!band) return { title: 'Not found' };
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/bpm/${band.slug}`;
  const title = `${band.label} Production Music | ${band.short} Tempo Sync Tracks`;
  const description = `License ${band.short.toLowerCase()}-tempo production music (${band.label}). ${band.description} Pre-cleared with stems and cutdowns.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'B2B Production Music', type: 'website' },
  };
}

export default async function BpmHubPage({ params }: BpmPageProps) {
  const band = findBpmBand(params.band);
  if (!band) notFound();

  const tracks = await getTracksByBpmBand(band);
  if (tracks.length === 0) notFound();

  const siteUrl = getSiteUrl();
  const allTracks = await getAllTracks();

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${band.label} Production Music`,
    description: band.description,
    url: `${siteUrl}/bpm/${band.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: tracks.length,
      itemListElement: tracks.map((track, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: track.title,
        url: `${siteUrl}/tracks/${track.slug}`,
      })),
    },
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

      <PageHeader
        crumbs={[{ href: '/', label: 'Home' }, { href: '/#catalog', label: 'Catalog' }, { label: band.label }]}
        eyebrow="Tempo"
        title={<>{band.short} <span className="text-obsidian-300">· {band.label}</span></>}
        description={band.description}
        image="/banners/banner-stage-lights.jpg"
        stats={catalogStats(tracks)}
        actions={
          <nav aria-label="Other tempos" className="flex flex-wrap gap-2">
            {BPM_BANDS.map(b => (
              <Link
                key={b.slug}
                href={`/bpm/${b.slug}`}
                aria-current={b.slug === band.slug ? 'page' : undefined}
                className={cn(
                  'h-9 px-4 inline-flex items-center rounded-full border text-xs font-medium transition-colors',
                  b.slug === band.slug
                    ? 'bg-white text-obsidian-950 border-white'
                    : 'border-white/15 text-zinc-300 hover:text-white hover:border-white/40',
                )}
              >
                {b.label}
              </Link>
            ))}
          </nav>
        }
      />

      <section className="py-12 lg:py-16">
        <Container>
          <div className="border border-white/[0.08] bg-obsidian-950">
            <CatalogExplorer initialTracks={tracks} />
          </div>
        </Container>
      </section>

      <GenreTiles tracks={allTracks} title="Browse by genre" />
    </div>
  );
}
