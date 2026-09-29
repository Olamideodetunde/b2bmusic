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
import { catalogStats, getSiteUrl, cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, collectionSchema, fitTitle, hubMetaDescription, hubRobots, hubSummary, type Crumb } from '@/lib/seo/hubs';

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
  const tracks = await getTracksByBpmBand(band);
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/bpm/${band.slug}`;
  const title = `${band.short} Production Music · ${band.label}`;
  const description = tracks.length
    ? hubMetaDescription(band.description, tracks, { omit: 'bpm' })
    : `${band.description} Pre-cleared with stems and cutdowns.`;
  return {
    title: fitTitle(title),
    description,
    alternates: { canonical: url },
    robots: hubRobots(tracks.length),
    openGraph: { title, description, url, siteName: BRAND.name, type: 'website' },
  };
}

export default async function BpmHubPage({ params }: BpmPageProps) {
  const band = findBpmBand(params.band);
  if (!band) notFound();

  const tracks = await getTracksByBpmBand(band);
  if (tracks.length === 0) notFound();

  const siteUrl = getSiteUrl();
  const allTracks = await getAllTracks();

  const url = `${siteUrl}/bpm/${band.slug}`;
  const summary = hubSummary(tracks);
  const crumbs: Crumb[] = [{ href: '/', label: 'Home' }, { href: '/bpm', label: 'Tempo' }, { label: band.label }];

  return (
    <div>
      <JsonLd data={[collectionSchema(siteUrl, url, `${band.label} production music`, summary, tracks), breadcrumbSchema(siteUrl, crumbs, url)]} />

      <PageHeader
        crumbs={crumbs}
        eyebrow="Tempo"
        title={<>{band.short} <span className="text-navy-300">· {band.label}</span></>}
        description={`${band.description} ${summary}`}
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
                    ? 'bg-white text-navy-950 border-white'
                    : 'border-white/15 text-slate-300 hover:text-white hover:border-white/40',
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
          <div className="border border-white/[0.08] bg-navy-950">
            <CatalogExplorer initialTracks={tracks} />
          </div>
        </Container>
      </section>

      <GenreTiles tracks={allTracks} title="Browse by genre" />
    </div>
  );
}
