import { Metadata } from 'next';
import { getAllTracks } from '@/lib/db';
import { PageHeader } from '@/components/navigation/PageHeader';
import { HubDirectory } from '@/components/hub/HubDirectory';
import { JsonLd } from '@/components/seo/JsonLd';
import { BPM_BANDS } from '@/lib/catalog/taxonomy';
import { getSiteUrl } from '@/lib/utils';
import { breadcrumbSchema, hubSummary, type Crumb } from '@/lib/seo/hubs';

export const revalidate = 3600;

const TITLE = 'Production Music by Tempo';
const DESCRIPTION = 'Slow, mid-tempo or fast: browse pre-cleared production music by BPM to match the pace of your edit.';

export function generateMetadata(): Metadata {
  const url = `${getSiteUrl()}/bpm`;
  return { title: TITLE, description: DESCRIPTION, alternates: { canonical: url }, openGraph: { title: TITLE, description: DESCRIPTION, url } };
}

export default async function TempoIndexPage() {
  const tracks = await getAllTracks();
  const siteUrl = getSiteUrl();
  const entries = BPM_BANDS.map(b => [b, tracks.filter(t => t.bpm >= b.min && t.bpm <= b.max)] as const)
    .filter(([, group]) => group.length > 0)
    .map(([b, group]) => ({
      href: `/bpm/${b.slug}`,
      name: `${b.short} · ${b.label}`,
      count: group.length,
      summary: `${b.description} ${hubSummary(group)}`,
    }));
  const crumbs: Crumb[] = [{ href: '/', label: 'Home' }, { label: 'Tempo' }];

  return (
    <div>
      <JsonLd data={breadcrumbSchema(siteUrl, crumbs, `${siteUrl}/bpm`)} />
      <PageHeader crumbs={crumbs} eyebrow="Browse" title={TITLE} description={DESCRIPTION} image="/banners/banner-monochrome-club.jpg" />
      <HubDirectory entries={entries} />
    </div>
  );
}
