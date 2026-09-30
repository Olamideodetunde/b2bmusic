/**
 * npm run audio:watermark -- --in ./masters [options]
 *
 * Builds the public previews for a folder of masters and (optionally) uploads everything
 * to object storage, so no audio ever lives in the repository or the Vercel deployment.
 *
 * For each .wav / .aif / .aiff / .flac file in --in:
 *   1. preview  — 128 kbps MP3 with an audio watermark every --every seconds
 *   2. masters  — 24-bit WAV (and AIFF with --aiff), untouched audio, for the PRIVATE bucket
 *   3. upload   — with --upload: masters → S3_MASTERS_BUCKET, previews → S3_PREVIEWS_BUCKET
 *   4. manifest — <out>/audio-manifest.csv with the values to paste into the Google Sheet:
 *                 Audio URL (J), Master WAV, Master AIFF
 *
 * Options:
 *   --out <dir>          working folder (default .audio-build/, gitignored)
 *   --watermark <file>   your voice ident / sound (default: WATERMARK_FILE, else a built-in chime)
 *   --every <s>          seconds between watermarks, 5–60 (default 12)
 *   --offset <s>         first watermark after this many seconds (default 3)
 *   --gain <dB>          watermark level, e.g. -10 (default -10)
 *   --bitrate <kbps>     preview bitrate (default 128)
 *   --aiff               also produce AIFF masters
 *   --upload             upload to the buckets (needs the S3_* variables; see docs/audio-and-access.md)
 *
 * FFmpeg comes from the ffmpeg-static package, or FFMPEG_PATH.
 */
import './env';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { toSlug } from '../src/lib/utils';
import { BRAND } from '../src/lib/brand';
import {
  DEFAULT_WATERMARK, defaultTagArgs, ffmpeg, masterArgs, previewArgs, probe, tagBedArgs, validateOptions, type WatermarkOptions,
} from '../src/lib/audio/watermark';
import { isStorageConfigured, previewUrl, putObject, storageConfig } from '../src/lib/storage/s3';
import { toCsv } from '../src/lib/ingest/csv';

const AUDIO_EXT = new Set(['.wav', '.aif', '.aiff', '.flac']);

function args() {
  const a = process.argv.slice(2);
  const val = (name: string) => {
    const i = a.indexOf(`--${name}`);
    return i > -1 ? a[i + 1] : undefined;
  };
  const num = (name: string, fallback: number) => (val(name) === undefined ? fallback : Number(val(name)));
  return {
    input: val('in'),
    out: val('out') ?? '.audio-build',
    watermark: val('watermark') ?? process.env.WATERMARK_FILE,
    upload: a.includes('--upload'),
    aiff: a.includes('--aiff'),
    options: {
      ...DEFAULT_WATERMARK,
      everySeconds: num('every', DEFAULT_WATERMARK.everySeconds),
      offsetSeconds: num('offset', DEFAULT_WATERMARK.offsetSeconds),
      gainDb: num('gain', DEFAULT_WATERMARK.gainDb),
      bitrateKbps: num('bitrate', DEFAULT_WATERMARK.bitrateKbps),
      comment: `Watermarked preview - ${BRAND.wordmark}`,
    } satisfies WatermarkOptions,
  };
}

async function main() {
  const opt = args();
  if (!opt.input) {
    console.error('Usage: npm run audio:watermark -- --in <masters folder> [--upload] [--aiff] [--watermark ident.wav]');
    process.exit(1);
  }
  validateOptions(opt.options);
  if (opt.upload && !(isStorageConfigured('masters') && isStorageConfigured('previews') && storageConfig().previewBaseUrl)) {
    console.error('--upload needs S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_MASTERS_BUCKET, S3_PREVIEWS_BUCKET and PREVIEW_PUBLIC_BASE_URL.');
    process.exit(1);
  }

  const files = (await fs.readdir(opt.input)).filter(f => AUDIO_EXT.has(path.extname(f).toLowerCase())).sort();
  if (files.length === 0) {
    console.error(`No .wav/.aif/.aiff/.flac files in ${opt.input}`);
    process.exit(1);
  }
  const dirs = { previews: path.join(opt.out, 'previews'), masters: path.join(opt.out, 'masters'), tmp: path.join(opt.out, 'tmp') };
  for (const d of Object.values(dirs)) await fs.mkdir(d, { recursive: true });

  // One tag bed for the whole run: the ident padded to exactly one repeat period.
  const tag = opt.watermark ?? path.join(dirs.tmp, 'default-chime.wav');
  if (!opt.watermark) await ffmpeg(defaultTagArgs(tag));
  const tagInfo = await probe(tag);
  if (tagInfo.durationSeconds >= opt.options.everySeconds - 1) {
    throw new Error(`The watermark is ${tagInfo.durationSeconds.toFixed(1)} s long — it must be shorter than --every (${opt.options.everySeconds} s) minus 1 s.`);
  }
  const bed = path.join(dirs.tmp, `tag-bed-${opt.options.everySeconds}s.wav`);
  await ffmpeg(tagBedArgs(tag, bed, opt.options.everySeconds));

  console.log(`Watermark: ${opt.watermark ? path.basename(opt.watermark) : 'built-in chime'} every ${opt.options.everySeconds}s ` +
    `(first at ${opt.options.offsetSeconds}s, ${opt.options.gainDb} dB) · previews ${opt.options.bitrateKbps} kbps · ${files.length} file(s)\n`);

  const manifest: Record<string, string>[] = [];
  let failed = 0;
  for (const file of files) {
    const src = path.join(opt.input, file);
    const slug = toSlug(path.basename(file, path.extname(file)));
    try {
      const info = await probe(src);

      // Masters: keep a WAV as-is; convert other formats losslessly to 24-bit WAV.
      const wav = path.join(dirs.masters, `${slug}.wav`);
      if (path.extname(file).toLowerCase() === '.wav') await fs.copyFile(src, wav);
      else await ffmpeg(masterArgs(src, wav, 'wav'));
      const aiff = opt.aiff ? path.join(dirs.masters, `${slug}.aiff`) : null;
      if (aiff) await ffmpeg(masterArgs(src, aiff, 'aiff'));

      // Preview. The content hash in the name lets the CDN cache it forever and makes a
      // re-run (e.g. a new watermark) produce a new URL instead of serving a stale file.
      const tmpPreview = path.join(dirs.tmp, `${slug}.mp3`);
      await ffmpeg(previewArgs(src, bed, tmpPreview, opt.options));
      const out = await probe(tmpPreview);
      if (Math.abs(out.durationSeconds - info.durationSeconds) > 0.5) throw new Error('preview length does not match the master');
      const buf = await fs.readFile(tmpPreview);
      const previewName = `${slug}-${createHash('sha256').update(buf).digest('hex').slice(0, 10)}.mp3`;
      await fs.rename(tmpPreview, path.join(dirs.previews, previewName));

      const keys = { preview: `previews/${previewName}`, wav: `masters/${slug}.wav`, aiff: aiff ? `masters/${slug}.aiff` : '' };
      let audioUrl = path.join(dirs.previews, previewName);
      if (opt.upload) {
        const { mastersBucket, previewsBucket } = storageConfig();
        await putObject(mastersBucket, keys.wav, await fs.readFile(wav), 'audio/wav');
        if (aiff) await putObject(mastersBucket, keys.aiff, await fs.readFile(aiff), 'audio/aiff');
        await putObject(previewsBucket, keys.preview, buf, 'audio/mpeg', 'public, max-age=31536000, immutable');
        audioUrl = previewUrl(keys.preview);
      }

      manifest.push({
        File: file,
        Slug: slug,
        Duration: `${Math.floor(info.durationSeconds / 60)}:${String(Math.round(info.durationSeconds % 60)).padStart(2, '0')}`,
        'Audio URL': audioUrl,
        'Master WAV': keys.wav,
        'Master AIFF': keys.aiff,
      });
      console.log(`  ✓ ${file} → ${previewName} (${out.bitrateKbps ?? '?'} kbps)${opt.upload ? ' · uploaded' : ''}`);
    } catch (err: any) {
      failed++;
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  const manifestPath = path.join(opt.out, 'audio-manifest.csv');
  await fs.writeFile(manifestPath, toCsv(manifest, ['File', 'Slug', 'Duration', 'Audio URL', 'Master WAV', 'Master AIFF']));
  await fs.rm(dirs.tmp, { recursive: true, force: true });
  console.log(`\n${manifest.length} done, ${failed} failed. Manifest: ${manifestPath}`);
  if (!opt.upload) console.log('Dry run: nothing uploaded. Re-run with --upload to publish to the buckets.');
  if (failed) process.exit(1);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
