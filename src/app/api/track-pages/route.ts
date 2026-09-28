/**
 * Programmatic Track Landing Page Ingestion & Update Endpoint
 * Route alias for Make.com: /api/track-pages
 * Supports full idempotency (updates existing records in-place without duplicates),
 * CORS preflight handling, and GET status diagnostics.
 */
export { GET, POST, OPTIONS } from '@/app/api/tracks/ingest/route';
