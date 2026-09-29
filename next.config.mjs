/** @type {import('next').NextConfig} */
const nextConfig = {
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
        source: '/api/(tracks|revalidate|publish-log|checkout|stripe)/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
