import React from 'react';
import { Track } from '@/lib/db/types';

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
    category: `Production Music > ${track.genre}`,
    offers: [
      {
        '@type': 'Offer',
        name: 'Creator & Web License',
        price: (track.standardPriceCents / 100).toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: pageUrl,
      },
      {
        '@type': 'Offer',
        name: 'Commercial & Agency License (Includes Stems)',
        price: ((track.agencyPriceCents || 2000) / 100).toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: pageUrl,
      },
      {
        '@type': 'Offer',
        name: 'Broadcast, OTT & Theatrical Sync Buyout',
        price: (track.broadcastPriceCents / 100).toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: pageUrl,
      }
    ],
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
        item: `${siteUrl}/genres/${track.genre.toLowerCase().replace(/\s+/g, '-')}`,
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
