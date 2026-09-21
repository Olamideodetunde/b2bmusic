import { MetadataRoute } from 'next';
import { getAllTracks } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://b2bproductionmusic.com';
  const tracks = await getAllTracks();

  // 1. Core pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // 2. Programmatic Track Pages
  const trackPages: MetadataRoute.Sitemap = tracks.map((track) => ({
    url: `${siteUrl}/tracks/${track.slug}`,
    lastModified: new Date(track.updatedAt || track.publishedAt),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // 3. Genre Hub Pages
  const uniqueGenres = Array.from(new Set(tracks.map((t) => t.genre.toLowerCase().replace(/\s+/g, '-'))));
  const genrePages: MetadataRoute.Sitemap = uniqueGenres.map((genre) => ({
    url: `${siteUrl}/genres/${genre}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // 4. Use Case Hub Pages
  const uniqueUseCases = new Set<string>();
  tracks.forEach((t) => {
    t.useCases.forEach((u) => uniqueUseCases.add(u.toLowerCase().replace(/\s+/g, '-')));
  });
  const useCasePages: MetadataRoute.Sitemap = Array.from(uniqueUseCases).map((useCase) => ({
    url: `${siteUrl}/use-cases/${useCase}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...trackPages, ...genrePages, ...useCasePages];
}
