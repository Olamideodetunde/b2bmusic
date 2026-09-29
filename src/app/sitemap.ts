import { MetadataRoute } from 'next';
import { getAllTracks } from '@/lib/db';
import type { Track } from '@/lib/db/types';
import { BPM_BANDS } from '@/lib/catalog/taxonomy';
import { getSiteUrl, toSlug } from '@/lib/utils';

// Rendered per request so a newly published track is in the sitemap immediately.
// (Next 14 doesn't invalidate metadata routes via revalidatePath('/sitemap.xml') —
// verified in the end-to-end publish test — and it's one cheap query per crawl.)
export const dynamic = 'force-dynamic';

/** Newest update among a hub's tracks — an honest lastmod instead of "now". */
const newest = (tracks: Track[]) =>
  new Date(Math.max(...tracks.map(t => Date.parse(t.updatedAt || t.publishedAt))));

function groupBy(tracks: Track[], keys: (t: Track) => string[]) {
  const groups = new Map<string, Track[]>();
  for (const t of tracks) for (const k of keys(t)) groups.set(k, [...(groups.get(k) ?? []), t]);
  return groups;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const tracks = await getAllTracks();
  if (tracks.length === 0) return [{ url: siteUrl, changeFrequency: 'daily', priority: 1 }];

  const catalogUpdated = newest(tracks);

  const core: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: catalogUpdated, changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/pricing`, lastModified: catalogUpdated, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const trackPages: MetadataRoute.Sitemap = tracks.map(track => ({
    url: `${siteUrl}/tracks/${track.slug}`,
    lastModified: new Date(track.updatedAt || track.publishedAt),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const hub = (path: string, group: Track[]) => ({
    url: `${siteUrl}${path}`,
    lastModified: newest(group),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  });

  const genreHubs = Array.from(groupBy(tracks, t => [toSlug(t.genre)])).map(([slug, g]) => hub(`/genres/${slug}`, g));
  const useCaseHubs = Array.from(groupBy(tracks, t => t.useCases.map(toSlug))).map(([slug, g]) => hub(`/use-cases/${slug}`, g));
  const bpmHubs = BPM_BANDS.map(b => [b, tracks.filter(t => t.bpm >= b.min && t.bpm <= b.max)] as const)
    .filter(([, g]) => g.length > 0)
    .map(([b, g]) => hub(`/bpm/${b.slug}`, g));

  return [...core, ...trackPages, ...genreHubs, ...useCaseHubs, ...bpmHubs];
}
