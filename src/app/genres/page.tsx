import { Metadata } from 'next';
import { getAllTracks } from '@/lib/db';
import { PageHeader } from '@/components/navigation/PageHeader';
import { HubDirectory } from '@/components/hub/HubDirectory';
import { JsonLd } from '@/components/seo/JsonLd';
import { getSiteUrl, toSlug } from '@/lib/utils';
import { breadcrumbSchema, hubSummary, type Crumb } from '@/lib/seo/hubs';

export const revalidate = 3600;

const TITLE = 'Production Music by Genre';
const DESCRIPTION = 'Browse the catalog by genre: every track pre-cleared for commercial sync, with stems and broadcast cutdowns.';

export function generateMetadata(): Metadata {
  const url = `${getSiteUrl()}/genres`;
  return { title: TITLE, description: DESCRIPTION, alternates: { canonical: url }, openGraph: { title: TITLE, description: DESCRIPTION, url } };
}

export default async function GenresIndexPage() {
  const tracks = await getAllTracks();
  const siteUrl = getSiteUrl();
  const genres = Array.from(new Set(tracks.map(t => t.genre))).sort();
  const entries = genres.map(g => {
    const group = tracks.filter(t => t.genre === g);
    return { href: `/genres/${toSlug(g)}`, name: g, count: group.length, summary: hubSummary(group, { omit: 'genre' }) };
  });
  const crumbs: Crumb[] = [{ href: '/', label: 'Home' }, { label: 'Genres' }];

  return (
    <div>
      <JsonLd data={breadcrumbSchema(siteUrl, crumbs, `${siteUrl}/genres`)} />
      <PageHeader crumbs={crumbs} eyebrow="Browse" title={TITLE} description={DESCRIPTION} image="/banners/banner-stage-lights.jpg" />
      <HubDirectory entries={entries} />
    </div>
  );
}
