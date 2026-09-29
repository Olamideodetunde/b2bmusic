import type { Metadata } from 'next';
import type { Track } from '@/lib/db/types';
import { excerpt, isIndexable } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

/**
 * A hub with fewer tracks than this is a thin page: it still renders and passes link
 * equity (follow), but is noindex and left out of the sitemap until the catalog grows.
 * Pages flip to indexable automatically once a second track joins the hub.
 */
export const MIN_INDEXABLE_HUB_TRACKS = 2;

/**
 * The layout template appends " | <brand>". Keep it when the full title stays within
 * ~65 characters (where Google truncates); otherwise use the page title alone.
 */
export function fitTitle(pageTitle: string): Metadata['title'] {
  return pageTitle.length + BRAND.name.length + 3 <= 65 ? pageTitle : { absolute: pageTitle };
}

export function isHubIndexable(trackCount: number): boolean {
  return trackCount >= MIN_INDEXABLE_HUB_TRACKS;
}

export function hubRobots(trackCount: number): Metadata['robots'] {
  const index = isIndexable() && isHubIndexable(trackCount);
  return { index, follow: true, googleBot: { index, follow: true, 'max-image-preview': 'large' } };
}

/** Most frequent values first, so the summary names what the hub is really made of. */
function top(values: string[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([v]) => v);
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * A description written from the hub's actual tracks (count, tempo range, genres, moods,
 * use cases), so no two hubs share the same copy.
 */
export function hubSummary(
  tracks: Track[],
  opts: { omit?: 'genre' | 'useCases' | 'bpm' } = {},
): string {
  const n = tracks.length;
  const bpms = tracks.map(t => t.bpm);
  const lo = Math.min(...bpms);
  const hi = Math.max(...bpms);
  const tempo = lo === hi ? `${lo} BPM` : `${lo}–${hi} BPM`;
  const genres = top(tracks.map(t => t.genre), 3);
  const moods = top(tracks.flatMap(t => t.moods ?? []), 3).map(m => m.toLowerCase());
  const uses = top(tracks.flatMap(t => t.useCases ?? []), 3);

  const genrePart = opts.omit !== 'genre' && genres.length ? ` in ${list(genres)}` : '';
  const tempoPart = opts.omit !== 'bpm' ? ` at ${tempo}` : '';
  const sentences = [`${n} pre-cleared ${n === 1 ? 'track' : 'tracks'}${tempoPart}${genrePart}.`];
  if (moods.length) sentences.push(`Mood: ${moods.join(', ')}.`);
  if (opts.omit !== 'useCases' && uses.length) sentences.push(`Built for ${list(uses)}.`);
  return sentences.join(' ');
}

/** Meta description for a hub: the data-driven summary plus the licensing promise, ≤ 158 chars. */
export function hubMetaDescription(lead: string, tracks: Track[], opts?: Parameters<typeof hubSummary>[1]): string {
  const suffix = ' Stems, cutdowns and a perpetual sync license.';
  return excerpt(`${lead} ${hubSummary(tracks, opts)}`, 158 - suffix.length) + suffix;
}

export type Crumb = { label: string; href?: string };

/** schema.org BreadcrumbList that mirrors the visible breadcrumb trail. */
export function breadcrumbSchema(siteUrl: string, crumbs: Crumb[], currentUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: !c.href ? currentUrl : c.href === '/' ? siteUrl : `${siteUrl}${c.href}`,
    })),
  };
}

/** CollectionPage + ItemList for a hub's tracks. */
export function collectionSchema(siteUrl: string, url: string, name: string, description: string, tracks: Track[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
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
}
