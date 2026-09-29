/**
 * Hosts whose images go through Next.js image optimization (resized, AVIF/WebP, cached).
 * Cover Image URLs come from the Google Sheet, so an arbitrary host must never be proxied
 * (that would turn the optimizer into an open image proxy billed to this site). Unknown
 * hosts still render, as a plain lazy-loaded <img>.
 *
 * Add a host with NEXT_PUBLIC_IMAGE_HOSTS=cdn.example.com,bucket.r2.dev
 * Keep this list in sync with next.config.mjs, which reads the same variable.
 */
export const DEFAULT_IMAGE_HOSTS = ['images.unsplash.com'];

export function imageHosts(): string[] {
  const extra = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || '')
    .split(',')
    .map(h => h.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_IMAGE_HOSTS, ...extra]));
}

/** True for site-relative paths and https URLs on an allow-listed host. */
export function canOptimize(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && imageHosts().includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
