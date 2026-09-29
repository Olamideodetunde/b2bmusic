/**
 * Route alias for Make.com: /api/track-pages
 * Delegates to /api/tracks for full backwards compatibility.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export { GET, POST, OPTIONS } from '@/app/api/tracks/route';
