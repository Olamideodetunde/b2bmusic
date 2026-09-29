// Image hosts allowed through next/image — mirrors src/lib/images.ts (same env variable).
const imageHosts = Array.from(new Set([
  'images.unsplash.com',
  ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean),
]));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: imageHosts.map((hostname) => ({ protocol: 'https', hostname })),
    // Covers and banners change rarely; cache optimized variants for a week.
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  experimental: {
    // node-postgres has optional native bindings; load it from node_modules at runtime
    // instead of bundling it.
    serverComponentsExternalPackages: ['pg'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        // API responses must never be cached by browsers or shared caches (except /api/catalog, which sets its own).
        source: '/api/(tracks|track-pages|revalidate|publish-log|checkout|stripe|webhooks)/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
