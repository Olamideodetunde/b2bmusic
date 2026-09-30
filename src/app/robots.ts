import { MetadataRoute } from 'next';
import { getSiteUrl, isIndexable } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  // Staging / preview deployments: keep crawlers out entirely.
  if (!isIndexable()) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/account'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
