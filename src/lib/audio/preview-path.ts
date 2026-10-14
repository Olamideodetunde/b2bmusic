/**
 * Site path that plays a track's watermarked preview: /api/preview/<id>[?mix=<altMixId>].
 * Pages and the browser only ever see this path — never the storage URL — and the route
 * answers with a short-lived signed link (see src/app/api/preview/[trackId]/route.ts).
 * Client-safe: no server imports.
 */
export function previewPath(trackId: number, mixId?: string): string {
  return `/api/preview/${trackId}${mixId ? `?mix=${encodeURIComponent(mixId)}` : ''}`;
}
