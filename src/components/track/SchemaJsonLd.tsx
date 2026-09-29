import React from 'react';
import { Track } from '@/lib/db/types';
import { toSlug, absoluteUrl } from '@/lib/utils';
import { LICENSE_TIERS, tierPriceCents } from '@/lib/licensing';
import { BRAND } from '@/lib/brand';
import { breadcrumbSchema as buildBreadcrumbs } from '@/lib/seo/hubs';

interface SchemaJsonLdProps {
  track: Track;
  siteUrl: string;
}

export function SchemaJsonLd({ track, siteUrl }: SchemaJsonLdProps) {
  const pageUrl = `${siteUrl}/tracks/${track.slug}`;

  // 1. AudioObject Structured Data
  const audioSchema = {
    '@context': 'https://schema.org',
    '@type': 'AudioObject',
    name: track.title,
    description: track.description,
    // Google requires absolute URLs; the sheet may supply site-relative paths.
    contentUrl: absoluteUrl(track.previewAudioUrl, siteUrl),
    encodingFormat: 'audio/mpeg',
    duration: `PT${track.durationSeconds}S`,
    genre: track.genre,
    author: {
      '@type': 'Organization',
      name: BRAND.name,
      url: siteUrl,
    },
  };

  // 2. Product Structured Data with 3 Tiers
  const coverUrl = track.coverImageUrl ? absoluteUrl(track.coverImageUrl, siteUrl) : `${siteUrl}${BRAND.ogImagePath}`;

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${track.title} - Commercial Synchronization License`,
    description: track.description,
    image: coverUrl,
    sku: `TRK-${track.id || track.slug}`,
    category: `Production Music > ${track.genre}`,
    brand: {
      '@type': 'Brand',
      name: BRAND.name,
    },
    // No aggregateRating: there are no real reviews, and fabricated review markup
    // violates Google's structured-data policies (risking a manual action).
    offers: LICENSE_TIERS.map((tier) => ({
      '@type': 'Offer',
      name: `${tier.name} License — ${tier.label}`,
      price: (tierPriceCents(track, tier.key) / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: pageUrl,
      seller: {
        '@type': 'Organization',
        name: BRAND.name,
      },
    })),
  };

  // 3. BreadcrumbList — mirrors the visible trail: Home › Genres › <genre> › <title>
  const breadcrumbSchema = buildBreadcrumbs(
    siteUrl,
    [
      { href: '/', label: 'Home' },
      { href: '/genres', label: 'Genres' },
      { href: `/genres/${toSlug(track.genre)}`, label: track.genre },
      { label: track.title },
    ],
    pageUrl,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(audioSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
