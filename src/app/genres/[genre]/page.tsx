import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getAllTracks, getTracksByGenre } from '@/lib/db';
import { CatalogExplorer } from '@/components/hub/CatalogExplorer';
import { PageHeader } from '@/components/navigation/PageHeader';
import { GenreTiles } from '@/components/hub/GenreTiles';
import { Container } from '@/components/home/primitives';
import { genreImage } from '@/lib/imagery';

import { catalogStats, getSiteUrl, toSlug } from '@/lib/utils';

interface GenrePageProps {
  params: { genre: string };
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const tracks = await getAllTracks();
  const uniqueGenres = Array.from(new Set(tracks.map(t => toSlug(t.genre))));
  return uniqueGenres.map(genre => ({ genre }));
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const genreTitle =
    (await getTracksByGenre(params.genre))[0]?.genre ??
    params.genre.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const genreUrl = `${siteUrl}/genres/${params.genre}`;

  return {
    title: `${genreTitle} Production Music | Commercial Licensing Library`,
    description: `Explore and license royalty-free ${genreTitle} commercial background music. Direct sync licenses, instant download, and YouTube Content ID clearance.`,
    alternates: {
      canonical: genreUrl,
    },
    openGraph: {
      title: `${genreTitle} Commercial Music | B2B Production Music`,
      description: `Browse 100% pre-cleared ${genreTitle} tracks with isolated stems and broadcast cutdowns.`,
      url: genreUrl,
      siteName: 'B2B Production Music',
      type: 'website',
      images: [
        {
          url: `${siteUrl}/banners/banner-stage-lights.jpg`,
          width: 1200,
          height: 630,
          alt: `${genreTitle} Music Catalog`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${genreTitle} Commercial Music | B2B Production Music`,
      description: `Browse 100% pre-cleared ${genreTitle} tracks with isolated stems and broadcast cutdowns.`,
      images: [`${siteUrl}/banners/banner-stage-lights.jpg`],
    },
  };
}

export default async function GenreHubPage({ params }: GenrePageProps) {
  const tracks = await getTracksByGenre(params.genre);
  const genreTitle = params.genre.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const siteUrl = getSiteUrl();

  if (tracks.length === 0) notFound();

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${genreTitle} Production Music Catalog`,
    description: `Curated collection of ${genreTitle} commercial production tracks.`,
    url: `${siteUrl}/genres/${params.genre}`,
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
  const genreName = tracks[0].genre;

  return (
    <div>
      {/* Schema.org Collection List */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <PageHeader
        crumbs={[{ href: '/', label: 'Home' }, { href: '/#catalog', label: 'Catalog' }, { label: genreName }]}
        eyebrow="Genre"
        title={genreName}
        description={`Broadcast-quality ${genreName.toLowerCase()} tracks formatted for commercial campaigns, streaming video, brand films and presentations — every one pre-cleared with stems and cutdowns.`}
        image={genreImage(genreName)}
        stats={catalogStats(tracks)}
      />

      <section className="py-12 lg:py-16">
        <Container>
          <div className="border border-white/[0.08] bg-obsidian-950">
            <CatalogExplorer initialTracks={tracks} />
          </div>
        </Container>
      </section>

      <GenreTiles tracks={allTracks} exclude={genreName} />
    </div>
  );
}
