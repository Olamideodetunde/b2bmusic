import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Audio lives in object storage, never in the Vercel deployment:
 *
 *   S3_MASTERS_BUCKET   PRIVATE — full-quality WAV/AIFF masters. Only reachable through
 *                       /api/download, which hands out 60-second signed links.
 *   S3_PREVIEWS_BUCKET  PUBLIC  — watermarked 128 kbps MP3 previews for the player,
 *                       served at PREVIEW_PUBLIC_BASE_URL (bucket URL or CDN in front of it).
 *
 * Works with Amazon S3 and with Backblaze B2's S3-compatible API:
 *   Amazon S3:    S3_REGION=us-east-1                       (no S3_ENDPOINT)
 *   Backblaze B2: S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com  S3_REGION=us-west-004
 */
export const SIGNED_URL_TTL_S = 60;

const g = globalThis as unknown as { __gb2bS3?: S3Client };

export function storageConfig() {
  return {
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    mastersBucket: process.env.S3_MASTERS_BUCKET || '',
    previewsBucket: process.env.S3_PREVIEWS_BUCKET || '',
    previewBaseUrl: (process.env.PREVIEW_PUBLIC_BASE_URL || '').replace(/\/+$/, ''),
  };
}

export function isStorageConfigured(kind: 'masters' | 'previews' = 'masters'): boolean {
  const c = storageConfig();
  return Boolean(c.accessKeyId && c.secretAccessKey && (kind === 'masters' ? c.mastersBucket : c.previewsBucket));
}

export function s3(): S3Client {
  if (g.__gb2bS3) return g.__gb2bS3;
  const c = storageConfig();
  g.__gb2bS3 = new S3Client({
    region: c.region,
    endpoint: c.endpoint,
    // B2 and most S3-compatible stores want path-style addressing when a custom endpoint is used.
    forcePathStyle: Boolean(c.endpoint) || process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
  });
  return g.__gb2bS3;
}

export { isValidObjectKey } from './keys';

/** Short-lived download link for a master; the browser never learns the bucket credentials. */
export async function signedMasterUrl(key: string, downloadName: string): Promise<string> {
  const c = storageConfig();
  const safeName = downloadName.replace(/[^A-Za-z0-9._ -]/g, '').slice(0, 120) || 'master';
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: c.mastersBucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${safeName}"`,
    }),
    { expiresIn: SIGNED_URL_TTL_S },
  );
}

export async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await s3().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return false;
    throw err;
  }
}

export async function putObject(bucket: string, key: string, body: Buffer, contentType: string, cacheControl?: string) {
  await s3().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: cacheControl }));
}

/** Public URL of a preview object. */
export function previewUrl(key: string): string {
  const base = storageConfig().previewBaseUrl;
  if (!base) throw new Error('PREVIEW_PUBLIC_BASE_URL is not set');
  return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;
}
