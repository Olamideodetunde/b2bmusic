import { Metadata } from 'next';
import { getAllTracks } from '@/lib/db';
import { PageHeader } from '@/components/navigation/PageHeader';
import { HubDirectory } from '@/components/hub/HubDirectory';
import { JsonLd } from '@/components/seo/JsonLd';
import { getSiteUrl, toSlug } from '@/lib/utils';
import { breadcrumbSchema, hubSummary, type Crumb } from '@/lib/seo/hubs';

export const revalidate = 3600;

const TITLE = 'Production Music by Use Case';
const DESCRIPTION = 'Find the right cue for the job, from product reveals and podcasts to trailers and broadcast spots. Every track is pre-cleared for sync.';

export function generateMetadata(): Metadata {
  const url = `${getSiteUrl()}/use-cases`;
  return { title: TITLE, description: DESCRIPTION, alternates: { canonical: url }, openGraph: { title: TITLE, description: DESCRIPTION, url } };
}

export default async function UseCasesIndexPage() {
  const tracks = await getAllTracks();
  const siteUrl = getSiteUrl();
  const groups = new Map<string, typeof tracks>();
  for (const t of tracks) for (const u of t.useCases) groups.set(u, [...(groups.get(u) ?? []), t]);
  const entries = Array.from(groups.entries())
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([name, group]) => ({ href: `/use-cases/${toSlug(name)}`, name, count: group.length, summary: hubSummary(group, { omit: 'useCases' }) }));
  const crumbs: Crumb[] = [{ href: '/', label: 'Home' }, { label: 'Use cases' }];

  return (
    <div>
      <JsonLd data={breadcrumbSchema(siteUrl, crumbs, `${siteUrl}/use-cases`)} />
      <PageHeader crumbs={crumbs} eyebrow="Browse" title={TITLE} description={DESCRIPTION} image="/banners/banner-dj-producer.jpg" />
      <HubDirectory entries={entries} />
    </div>
  );
}
