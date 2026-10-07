import React from 'react';
import { Track } from '@/lib/db/types';
import { toSlug, absoluteUrl, titleCase } from '@/lib/utils';
import { LICENSE_TIERS, tierPriceCents } from '@/lib/licensing';
import { BRAND } from '@/lib/brand';
import { breadcrumbSchema as buildBreadcrumbs } from '@/lib/seo/hubs';
import { JsonLd } from '@/components/seo/JsonLd';

interface SchemaJsonLdProps {
  track: Track;
  siteUrl: string;
}

/** 110 → "PT1M50S" (ISO 8601 duration). */
export function isoDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `PT${m ? `${m}M` : ''}${s % 60 || !m ? `${s % 60}S` : ''}`;
}

/**
 * One linked graph per track page (rather than unrelated blocks), so search engines
 * understand that the page, the recording, the license product and the breadcrumb all
 * describe the same thing:
 *
 *   WebPage ──mainEntity──▶ MusicRecording ◀──subjectOf── Product (3 license Offers)
 *      └──breadcrumb──▶ BreadcrumbList          seller/publisher ──▶ Organization
 */
export function SchemaJsonLd({ track, siteUrl }: SchemaJsonLdProps) {
  const pageUrl = `${siteUrl}/tracks/${track.slug}`;
  const ids = {
    org: `${siteUrl}/#organization`,
    website: `${siteUrl}/#website`,
    page: `${pageUrl}#webpage`,
    recording: `${pageUrl}#recording`,
    product: `${pageUrl}#product`,
    breadcrumb: `${pageUrl}#breadcrumb`,
  };
  const cover = track.coverImageUrl ? absoluteUrl(track.coverImageUrl, siteUrl) : `${siteUrl}${BRAND.ogImagePath}`;
  const duration = isoDuration(track.durationSeconds);
  const keyword = track.targetKeyword ? titleCase(track.targetKeyword) : '';
  const composer = track.syncMeta?.composer?.trim();

  const graph = [
    {
      '@type': 'WebPage',
      '@id': ids.page,
      url: pageUrl,
      name: keyword ? `${track.title} – ${keyword}` : track.title,
      description: track.description,
      isPartOf: { '@id': ids.website },
      breadcrumb: { '@id': ids.breadcrumb },
      mainEntity: { '@id': ids.recording },
      primaryImageOfPage: { '@type': 'ImageObject', url: cover },
      datePublished: track.publishedAt,
      dateModified: track.updatedAt,
      inLanguage: 'en',
    },
    {
      '@type': 'MusicRecording',
      '@id': ids.recording,
      name: track.title,
      url: pageUrl,
      description: track.description,
      duration,
      genre: track.genre,
      image: cover,
      keywords: [track.targetKeyword, ...track.moods, ...track.useCases].filter(Boolean).join(', '),
      ...(track.syncMeta?.isrc ? { isrcCode: track.syncMeta.isrc } : {}),
      byArtist: composer ? { '@type': 'Person', name: composer } : { '@id': ids.org },
      publisher: { '@id': ids.org },
      audio: {
        '@type': 'AudioObject',
        name: `${track.title} (preview)`,
        // Google requires absolute URLs; the sheet may supply site-relative paths.
        contentUrl: absoluteUrl(track.previewAudioUrl, siteUrl),
        encodingFormat: 'audio/mpeg',
        duration,
      },
    },
    {
      '@type': 'Product',
      '@id': ids.product,
      name: `${track.title} – Commercial Sync License`,
      description: track.description,
      url: pageUrl,
      image: cover,
      sku: `TRK-${track.id}`,
      category: `Production Music > ${track.genre}`,
      brand: { '@type': 'Brand', name: BRAND.name },
      subjectOf: { '@id': ids.recording },
      // No aggregateRating: there are no real reviews, and fabricated review markup
      // violates Google's structured-data policies (risking a manual action).
      offers: LICENSE_TIERS.map(tier => ({
        '@type': 'Offer',
        name: `${tier.name} License — ${tier.label}`,
        price: (tierPriceCents(track, tier.key) / 100).toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        url: pageUrl,
        seller: { '@id': ids.org },
      })),
    },
    {
      // Mirrors the visible trail: Home › Genres › <genre> › <title>
      ...buildBreadcrumbs(
        siteUrl,
        [
          { href: '/', label: 'Home' },
          { href: '/genres', label: 'Genres' },
          { href: `/genres/${toSlug(track.genre)}`, label: track.genre },
          { label: track.title },
        ],
        pageUrl,
      ),
      '@id': ids.breadcrumb,
    },
    { '@type': 'Organization', '@id': ids.org, name: BRAND.name, url: siteUrl, logo: `${siteUrl}${BRAND.logoPath}` },
    { '@type': 'WebSite', '@id': ids.website, url: siteUrl, name: BRAND.name, publisher: { '@id': ids.org } },
  ].map(node => {
    const { '@context': _ctx, ...rest } = node as Record<string, unknown>;
    return rest;
  });

  return <JsonLd data={{ '@context': 'https://schema.org', '@graph': graph }} />;
}
