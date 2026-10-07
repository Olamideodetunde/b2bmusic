import { Metadata } from 'next';
import { getAllTracks } from '@/lib/db';
import { PageHeader } from '@/components/navigation/PageHeader';
import { HubDirectory } from '@/components/hub/HubDirectory';
import { JsonLd } from '@/components/seo/JsonLd';
import { getSiteUrl, toSlug } from '@/lib/utils';
import { breadcrumbSchema, hubSummary, type Crumb } from '@/lib/seo/hubs';
import { socialMeta } from '@/lib/seo/meta';

export const revalidate = 3600;

const TITLE = 'Production Music by Use Case';
const DESCRIPTION = 'Find the right cue for the job, from product reveals and podcasts to trailers and broadcast spots. Every track is pre-cleared for sync.';

export function generateMetadata(): Metadata {
  const url = `${getSiteUrl()}/use-cases`;
  return { title: TITLE, description: DESCRIPTION, alternates: { canonical: url }, ...socialMeta({ title: TITLE, description: DESCRIPTION, url }) };
}

export default async function UseCasesIndexPage() {
  const tracks = await getAllTracks();
  const siteUrl = getSiteUrl();
  const groups = new Map<string, typeof tracks>();
  const labels = new Map<string, string>();
  for (const t of tracks) {
    for (const u of t.useCases) {
      const slug = toSlug(u);
      if (!slug) continue;
      if (!labels.has(slug)) labels.set(slug, u);
      const group = groups.get(slug) ?? [];
      if (!group.includes(t)) group.push(t);
      groups.set(slug, group);
    }
  }
  const entries = Array.from(groups.entries())
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([slug, group]) => ({ href: `/use-cases/${slug}`, name: labels.get(slug)!, count: group.length, summary: hubSummary(group, { omit: 'useCases' }) }));
  const crumbs: Crumb[] = [{ href: '/', label: 'Home' }, { label: 'Use cases' }];

  return (
    <div>
      <JsonLd data={breadcrumbSchema(siteUrl, crumbs, `${siteUrl}/use-cases`)} />
      <PageHeader crumbs={crumbs} eyebrow="Browse" title={TITLE} description={DESCRIPTION} image="/banners/banner-dj-producer.jpg" />
      <HubDirectory entries={entries} />
    </div>
  );
}
