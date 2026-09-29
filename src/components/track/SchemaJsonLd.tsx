import React from 'react';
import { Track } from '@/lib/db/types';
import { toSlug } from '@/lib/utils';
import { LICENSE_TIERS, tierPriceCents } from '@/lib/licensing';

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
    contentUrl: track.previewAudioUrl,
    encodingFormat: 'audio/mpeg',
    duration: `PT${track.durationSeconds}S`,
    genre: track.genre,
    author: {
      '@type': 'Organization',
      name: 'B2B Production Music',
      url: siteUrl,
    },
  };

  // 2. Product Structured Data with 3 Tiers
  const coverUrl = track.coverImageUrl
    ? (track.coverImageUrl.startsWith('http') ? track.coverImageUrl : `${siteUrl}${track.coverImageUrl.startsWith('/') ? '' : '/'}${track.coverImageUrl}`)
    : `${siteUrl}/images/default-cover.jpg`;

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
      name: 'B2B Production Music',
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
        name: 'B2B Production Music',
      },
    })),
  };

  // 3. BreadcrumbList Structured Data
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Catalog',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: track.genre,
        item: `${siteUrl}/genres/${toSlug(track.genre)}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: track.title,
        item: pageUrl,
      },
    ],
  };

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
