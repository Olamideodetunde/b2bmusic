import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getAllTracks, getTracksByGenre } from '@/lib/db';
import { CatalogExplorer } from '@/components/hub/CatalogExplorer';
import { PageHeader } from '@/components/navigation/PageHeader';
import { GenreTiles } from '@/components/hub/GenreTiles';
import { Container } from '@/components/home/primitives';
import { JsonLd } from '@/components/seo/JsonLd';
import { genreImage } from '@/lib/imagery';
import { catalogStats, getSiteUrl, toSlug } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import { breadcrumbSchema, collectionSchema, fitTitle, hubMetaDescription, hubRobots, hubSummary, type Crumb } from '@/lib/seo/hubs';

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
  const tracks = await getTracksByGenre(params.genre);
  if (tracks.length === 0) return { title: 'Not found' };
  const siteUrl = getSiteUrl();
  const genre = tracks[0].genre;
  const url = `${siteUrl}/genres/${params.genre}`;
  const title = `${genre} Production Music`;
  const description = hubMetaDescription(`License ${genre.toLowerCase()} production music.`, tracks, { omit: 'genre' });
  const image = `${siteUrl}${genreImage(genre)}`;

  return {
    title: fitTitle(title),
    description,
    alternates: { canonical: url },
    robots: hubRobots(tracks.length),
    openGraph: { title, description, url, siteName: BRAND.name, type: 'website', images: [{ url: image, alt: `${genre} music catalog` }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function GenreHubPage({ params }: GenrePageProps) {
  const tracks = await getTracksByGenre(params.genre);
  if (tracks.length === 0) notFound();

  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/genres/${params.genre}`;
  const genreName = tracks[0].genre;
  const summary = hubSummary(tracks, { omit: 'genre' });
  const crumbs: Crumb[] = [{ href: '/', label: 'Home' }, { href: '/genres', label: 'Genres' }, { label: genreName }];
  const allTracks = await getAllTracks();

  return (
    <div>
      <JsonLd data={[collectionSchema(siteUrl, url, `${genreName} production music`, summary, tracks), breadcrumbSchema(siteUrl, crumbs, url)]} />

      <PageHeader
        crumbs={crumbs}
        eyebrow="Genre"
        title={genreName}
        description={`${summary} Every track is pre-cleared, with stems and cutdowns.`}
        image={genreImage(genreName)}
        stats={catalogStats(tracks)}
      />

      <section className="py-12 lg:py-16">
        <Container>
          <div className="border border-white/[0.08] bg-navy-950">
            <CatalogExplorer initialTracks={tracks} />
          </div>
        </Container>
      </section>

      <GenreTiles tracks={allTracks} exclude={genreName} />
    </div>
  );
}
