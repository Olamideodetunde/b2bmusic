import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { isStorageConfigured, objectExists, s3, storageConfig } from './s3';

/**
 * Previews are served through signed links, so the bucket can be PRIVATE: a copied link
 * stops working after this long. Long enough for a track to be played, paused and seeked;
 * if it does expire mid-session the player simply asks /api/preview again.
 */
export const PREVIEW_URL_TTL_S = 15 * 60;

/**
 * Object key of a preview stored in our previews bucket, from the Audio URL in the sheet
 * (PREVIEW_PUBLIC_BASE_URL/<key>). Null for any other URL (external host, local /public file).
 */
export function previewKeyFromUrl(url: string): string | null {
  const base = storageConfig().previewBaseUrl;
  if (!base || !url.startsWith(`${base}/`)) return null;
  const key = url.slice(base.length + 1).split(/[?#]/)[0].split('/').map(decodeURIComponent).join('/');
  return key && !key.includes('..') ? key : null;
}

/** Where to send the player: a short-lived signed link for our previews, otherwise the URL as is. */
export async function playablePreviewUrl(url: string): Promise<string> {
  const key = previewKeyFromUrl(url);
  if (!key || !isStorageConfigured('previews')) return url;
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: storageConfig().previewsBucket, Key: key }), {
    expiresIn: PREVIEW_URL_TTL_S,
  });
}

/**
 * Publish-time check for previews in our bucket, using the storage credentials (a public
 * HEAD request fails once the bucket is private). Undefined = not one of ours, check by URL.
 */
export async function checkStoredPreview(url: string): Promise<string | null | undefined> {
  const key = previewKeyFromUrl(url);
  if (!key || !isStorageConfigured('previews')) return undefined;
  try {
    return (await objectExists(storageConfig().previewsBucket, key)) ? null : `Audio URL not found in the previews bucket (${key})`;
  } catch (err: any) {
    return `Could not check the preview in storage (${err?.name ?? 'error'})`;
  }
}
