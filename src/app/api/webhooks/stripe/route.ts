/**
 * Route alias: /api/webhooks/stripe
 * Delegates to /api/stripe/webhook for backwards compatibility.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export { POST } from '@/app/api/stripe/webhook/route';
