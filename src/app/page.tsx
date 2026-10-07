import React from 'react';
import { Metadata } from 'next';
import { getAllTracks } from '@/lib/db';
import { HeroSection } from '@/components/home/HeroSection';
import { UseCaseMarquee } from '@/components/home/UseCaseMarquee';
import { CuratedCollections } from '@/components/home/CuratedCollections';
import { ToolkitShowcase } from '@/components/home/ToolkitShowcase';
import { ClearanceSection } from '@/components/home/ClearanceSection';
import { PricingTeaser } from '@/components/home/PricingTeaser';
import { ClosingCta } from '@/components/home/ClosingCta';
import { Container, Reveal, SectionHeading, ArrowLink } from '@/components/home/primitives';
import { CatalogExplorer } from '@/components/hub/CatalogExplorer';
import { formatPrice, getSiteUrl } from '@/lib/utils';
import { LICENSE_TIERS, tierPriceCents, type LicenseTierKey } from '@/lib/licensing';
import { BRAND } from '@/lib/brand';
import { JsonLd } from '@/components/seo/JsonLd';
import { SITE_DESCRIPTION, SITE_TITLE, socialMeta } from '@/lib/seo/meta';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  return {
    // The root page isn't wrapped by the layout's title template, so it carries the brand itself.
    title: { absolute: SITE_TITLE },
    description: SITE_DESCRIPTION,
    alternates: { canonical: siteUrl },
    ...socialMeta({ title: SITE_TITLE, description: SITE_DESCRIPTION, url: '/' }),
  };
}

export default async function HomePage() {
  const tracks = await getAllTracks();
  const siteUrl = getSiteUrl();

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: BRAND.name,
    url: siteUrl,
    logo: `${siteUrl}${BRAND.logoPath}`,
    description: 'Commercial production music catalog and direct sync licensing provider for media, film, broadcast, and digital agencies.',
    contactPoint: {
      '@type': 'ContactPoint',
      email: BRAND.contactEmail,
      contactType: 'customer support',
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: BRAND.name,
    url: siteUrl,
    publisher: { '@id': `${siteUrl}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const stemCount = tracks.reduce((n, t) => n + t.stems.length, 0);
  // The toolkit demo needs a track with stems, alt-mixes and cue-sheet data (sheet-only tracks have none).
  const fromPrices = Object.fromEntries(
    LICENSE_TIERS.map(t => [t.key, tracks.length ? formatPrice(Math.min(...tracks.map(tr => tierPriceCents(tr, t.key)))).replace(/\.00$/, '') : "—"]),
  ) as Record<LicenseTierKey, string>;
  const toolkitTrack = tracks.find(t => t.stems.length > 0 && t.altMixes.length > 0 && t.syncMeta);

  return (
    <div className="bg-navy-950 text-white">
      {/* Search Engine Structured Data */}
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />

      <HeroSection tracks={tracks} />
      <UseCaseMarquee />
      <CuratedCollections tracks={tracks} />
      {toolkitTrack && <ToolkitShowcase track={toolkitTrack} />}

      {/* ─── Catalog ─── */}
      <section id="catalog" className="py-24 lg:py-32 border-t border-white/[0.06] scroll-mt-16">
        <Container>
          <SectionHeading
            eyebrow="The catalog"
            title={<>Audition. Filter. <span className="text-navy-300">License.</span></>}
            description={`${tracks.length} master recordings and ${stemCount} isolated stems — filter by tempo, key, mood and vocal, then scrub any waveform to audition.`}
            aside={<ArrowLink href="/pricing">Licenses from $10</ArrowLink>}
          />
          <Reveal>
            <div className="border border-white/[0.08] bg-navy-950">
              <CatalogExplorer initialTracks={tracks} />
            </div>
          </Reveal>
        </Container>
      </section>

      <ClearanceSection />
      <PricingTeaser fromPrices={fromPrices} />
      <ClosingCta />
    </div>
  );
}
