import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getAllTracks, getTracksByUseCase } from '@/lib/db';
import { CatalogExplorer } from '@/components/hub/CatalogExplorer';
import { PageHeader } from '@/components/navigation/PageHeader';
import { GenreTiles } from '@/components/hub/GenreTiles';
import { Container } from '@/components/home/primitives';
import { JsonLd } from '@/components/seo/JsonLd';
import { useCaseImage } from '@/lib/imagery';
import { catalogStats, getSiteUrl, toSlug } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import { breadcrumbSchema, collectionSchema, fitTitle, hubMetaDescription, hubRobots, hubSummary, type Crumb } from '@/lib/seo/hubs';
import type { Track } from '@/lib/db/types';

interface UseCasePageProps {
  params: { useCase: string };
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const tracks = await getAllTracks();
  const cases = new Set<string>();
  tracks.forEach(t => t.useCases.forEach(u => cases.add(toSlug(u))));
  return Array.from(cases).map(useCase => ({ useCase }));
}

/** Prefer the exact label from the data ("SaaS Product Reveal") over a title-cased slug. */
function useCaseLabel(tracks: Track[], slug: string): string {
  return (
    tracks.flatMap(t => t.useCases).find(u => toSlug(u) === slug) ??
    slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  );
}

export async function generateMetadata({ params }: UseCasePageProps): Promise<Metadata> {
  const tracks = await getTracksByUseCase(params.useCase);
  if (tracks.length === 0) return { title: 'Not found' };
  const siteUrl = getSiteUrl();
  const name = useCaseLabel(tracks, params.useCase);
  const url = `${siteUrl}/use-cases/${params.useCase}`;
  const title = `Music for ${name}`;
  const description = hubMetaDescription(`Production music for ${name}.`, tracks, { omit: 'useCases' });
  const image = `${siteUrl}${useCaseImage(params.useCase)}`;

  return {
    title: fitTitle(title),
    description,
    alternates: { canonical: url },
    robots: hubRobots(tracks.length),
    openGraph: { title, description, url, siteName: BRAND.name, type: 'website', images: [{ url: image, alt: `Music for ${name}` }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function UseCaseHubPage({ params }: UseCasePageProps) {
  const tracks = await getTracksByUseCase(params.useCase);
  if (tracks.length === 0) notFound();

  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/use-cases/${params.useCase}`;
  const name = useCaseLabel(tracks, params.useCase);
  const summary = hubSummary(tracks, { omit: 'useCases' });
  const crumbs: Crumb[] = [{ href: '/', label: 'Home' }, { href: '/use-cases', label: 'Use cases' }, { label: name }];
  const allTracks = await getAllTracks();

  return (
    <div>
      <JsonLd data={[collectionSchema(siteUrl, url, `Production music for ${name}`, summary, tracks), breadcrumbSchema(siteUrl, crumbs, url)]} />

      <PageHeader
        crumbs={crumbs}
        eyebrow="Use case"
        title={<>Music for <span className="text-navy-300">{name}</span></>}
        description={`${summary} Each one sits under voiceover and follows picture, with stems for the mix.`}
        image={useCaseImage(params.useCase)}
        stats={catalogStats(tracks)}
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
