import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getAllTracks, getTracksByUseCase } from '@/lib/db';
import { CatalogExplorer } from '@/components/hub/CatalogExplorer';
import { PageHeader } from '@/components/navigation/PageHeader';
import { GenreTiles } from '@/components/hub/GenreTiles';
import { Container } from '@/components/home/primitives';
import { useCaseImage } from '@/lib/imagery';

import { catalogStats, getSiteUrl, toSlug } from '@/lib/utils';

interface UseCasePageProps {
  params: { useCase: string };
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const tracks = await getAllTracks();
  const cases = new Set<string>();
  tracks.forEach(t => {
    t.useCases.forEach(u => cases.add(toSlug(u)));
  });
  return Array.from(cases).map(useCase => ({ useCase }));
}

export async function generateMetadata({ params }: UseCasePageProps): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const useCaseTitle =
    (await getTracksByUseCase(params.useCase)).flatMap(t => t.useCases).find(u => toSlug(u) === params.useCase) ??
    params.useCase.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const useCaseUrl = `${siteUrl}/use-cases/${params.useCase}`;

  return {
    title: `Best Music for ${useCaseTitle} | Commercial Sync Catalog`,
    description: `Curated royalty-free commercial production music for ${useCaseTitle}. High impact, voiceover-friendly audio cleared for commercial broadcast and YouTube.`,
    alternates: {
      canonical: useCaseUrl,
    },
    openGraph: {
      title: `Commercial Music for ${useCaseTitle} | B2B Production Music`,
      description: `Curated production tracks engineered for ${useCaseTitle}. Pre-cleared worldwide sync licenses with stems.`,
      url: useCaseUrl,
      siteName: 'B2B Production Music',
      type: 'website',
      images: [
        {
          url: `${siteUrl}/banners/banner-dj-producer.jpg`,
          width: 1200,
          height: 630,
          alt: `Music for ${useCaseTitle}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Commercial Music for ${useCaseTitle} | B2B Production Music`,
      description: `Curated production tracks engineered for ${useCaseTitle}. Pre-cleared worldwide sync licenses with stems.`,
      images: [`${siteUrl}/banners/banner-dj-producer.jpg`],
    },
  };
}

export default async function UseCaseHubPage({ params }: UseCasePageProps) {
  const tracks = await getTracksByUseCase(params.useCase);
  const useCaseTitle = params.useCase.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const siteUrl = getSiteUrl();

  if (tracks.length === 0) notFound();

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Production Music for ${useCaseTitle}`,
    description: `Curated commercial sync music engineered for ${useCaseTitle}.`,
    url: `${siteUrl}/use-cases/${params.useCase}`,
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

  const allTracks = await getAllTracks();
  // Prefer the exact label from the data ("SaaS Product Reveal") over the slug title-case.
  const useCaseName =
    tracks.flatMap(t => t.useCases).find(u => toSlug(u) === params.useCase) ?? useCaseTitle;

  return (
    <div>
      {/* Schema.org Collection List */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <PageHeader
        crumbs={[{ href: '/', label: 'Home' }, { href: '/#catalog', label: 'Catalog' }, { label: useCaseName }]}
        eyebrow="Use case"
        title={<>Music for <span className="text-obsidian-300">{useCaseName}</span></>}
        description="Engineered to sit under voiceover, follow product pacing and carry a narrative arc — without frequency masking or clutter."
        image={useCaseImage(params.useCase)}
        stats={catalogStats(tracks)}
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
