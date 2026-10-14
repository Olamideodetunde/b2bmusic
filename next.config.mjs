// Image hosts allowed through next/image — mirrors src/lib/images.ts (same env variable).
const imageHosts = Array.from(new Set([
  'images.unsplash.com',
  ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean),
]));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // `npm run build:standalone` (shared hosting / any plain Node server) sets this to get a
  // self-contained server.js bundle. Vercel builds are unaffected.
  ...(process.env.BUILD_STANDALONE === 'true' ? { output: 'standalone' } : {}),
  images: {
    // Standalone builds (shared hosting) serve images as-is: Next's optimizer needs the native
    // `sharp` package there (without it it returns empty images), and resizing on a CPU-limited
    // shared plan would be slow anyway. Vercel keeps full AVIF/WebP optimization.
    unoptimized: process.env.BUILD_STANDALONE === 'true',
    formats: ['image/avif', 'image/webp'],
    remotePatterns: imageHosts.map((hostname) => ({ protocol: 'https', hostname })),
    // Covers and banners change rarely; cache optimized variants for a week.
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  experimental: {
    // node-postgres and mysql2 have optional native bindings / dynamic requires; load them
    // from node_modules at runtime instead of bundling them.
    serverComponentsExternalPackages: ['pg', 'mysql2'],
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
        source: '/api/(tracks|track-pages|revalidate|publish-log|checkout|stripe|webhooks|auth|me|download|subscribe|billing-portal)/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
