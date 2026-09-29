/**
 * Editorial imagery shared across the landing page and hub pages.
 * All photography is graded to monochrome in the UI so the set reads as one.
 */
// Keys are the sheet's Genre dropdown values (src/lib/catalog/taxonomy.ts).
const GENRE_IMAGES: Record<string, string> = {
  Cinematic: '/banners/banner-fireworks-magenta.jpg',
  Electronic: '/banners/banner-spark-energy.jpg',
  'Corporate / Tech': '/banners/banner-dj-producer.jpg',
  'Folk & Acoustic': '/banners/banner-crowd-amber.jpg',
  Ambient: '/banners/banner-monochrome-club.jpg',
  'Hip Hop': '/banners/banner-red-blur.jpg',
  'Indie Rock': '/banners/banner-stage-lights.jpg',
};

const FALLBACK_IMAGES = [
  '/banners/banner-stage-lights.jpg',
  '/banners/banner-monochrome-club.jpg',
  '/banners/banner-paris-concert.jpg',
  '/banners/banner-dj-producer.jpg',
  '/banners/banner-crowd-amber.jpg',
  '/banners/banner-spark-energy.jpg',
];

/** Stable pick from the fallback set, so a given slug always gets the same image. */
function pick(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FALLBACK_IMAGES[h % FALLBACK_IMAGES.length];
}

export function genreImage(genre: string): string {
  return GENRE_IMAGES[genre] ?? pick(genre);
}

export function useCaseImage(slug: string): string {
  return pick(slug);
}
