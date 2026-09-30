import { execFile } from 'child_process';
import { promisify } from 'util';

/**
 * FFmpeg building blocks for the preview pipeline (scripts/watermark-catalog.ts).
 *
 * Every public preview is a 128 kbps MP3 with an audio watermark mixed in: a short
 * "tag" (a voice ident, or a built-in two-note chime) repeated every N seconds. The
 * full-quality masters are never modified; they go to the private bucket untouched.
 *
 * Server-side tooling only — nothing in the Next.js app imports this module.
 */
const run = promisify(execFile);

export interface WatermarkOptions {
  /** Seconds between tag repeats (the brief asks for 10–15 s). */
  everySeconds: number;
  /** First tag after this many seconds. */
  offsetSeconds: number;
  /** Tag level relative to its source, in dB (negative = quieter). */
  gainDb: number;
  /** MP3 bitrate for previews. */
  bitrateKbps: number;
  /** Text written to the MP3's comment tag. */
  comment: string;
}

export const DEFAULT_WATERMARK: WatermarkOptions = {
  everySeconds: 12,
  offsetSeconds: 3,
  gainDb: -10,
  bitrateKbps: 128,
  comment: 'Watermarked preview',
};

const SR = 44100;
const STEREO = `aformat=sample_rates=${SR}:channel_layouts=stereo`;

export function ffmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const bundled = require('ffmpeg-static') as string | null;
  if (!bundled) throw new Error('No FFmpeg binary: install ffmpeg-static or set FFMPEG_PATH');
  return bundled;
}

export function validateOptions(o: WatermarkOptions): void {
  if (!(o.everySeconds >= 5 && o.everySeconds <= 60)) throw new Error('--every must be between 5 and 60 seconds');
  if (!(o.offsetSeconds >= 0 && o.offsetSeconds < o.everySeconds)) throw new Error('--offset must be ≥ 0 and shorter than --every');
  if (!(o.gainDb <= 6 && o.gainDb >= -40)) throw new Error('--gain must be between -40 and +6 dB');
  if (![96, 112, 128, 160, 192].includes(o.bitrateKbps)) throw new Error('--bitrate must be 96, 112, 128, 160 or 192');
}

/** The built-in watermark: a soft two-note chime (E6 → B6, ~0.5 s). */
export function defaultTagArgs(out: string): string[] {
  return [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `sine=frequency=1318.5:sample_rate=${SR}:duration=0.16`,
    '-f', 'lavfi', '-i', `sine=frequency=1975.5:sample_rate=${SR}:duration=0.34`,
    '-filter_complex',
    `[0:a][1:a]concat=n=2:v=0:a=1,afade=t=in:d=0.01,afade=t=out:st=0.34:d=0.16,${STEREO},volume=0.45[out]`,
    '-map', '[out]', out,
  ];
}

/** Pads the tag with silence to exactly one repeat period, so looping it repeats every N s. */
export function tagBedArgs(tag: string, out: string, everySeconds: number): string[] {
  return [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', tag,
    '-af', `${STEREO},apad=whole_dur=${everySeconds}`,
    '-t', String(everySeconds),
    out,
  ];
}

/** Master + looped tag bed → watermarked MP3 preview. */
export function previewArgs(master: string, tagBed: string, out: string, o: WatermarkOptions): string[] {
  const delayMs = Math.round(o.offsetSeconds * 1000);
  const graph = [
    `[0:a]${STEREO}[m]`,
    `[1:a]${STEREO},volume=${o.gainDb}dB,adelay=delays=${delayMs}:all=1[wm]`,
    // normalize=0 keeps the music at its original level (amix would otherwise halve it);
    // the limiter catches any peak the tag adds. level=false stops it from raising loudness.
    `[m][wm]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.97:level=false[out]`,
  ].join(';');
  return [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', master,
    '-stream_loop', '-1', '-i', tagBed,
    '-filter_complex', graph,
    '-map', '[out]',
    '-map_metadata', '-1',
    '-c:a', 'libmp3lame', '-b:a', `${o.bitrateKbps}k`, '-ar', String(SR), '-ac', '2',
    '-id3v2_version', '3', '-metadata', `comment=${o.comment}`,
    out,
  ];
}

/** Lossless 24-bit conversions for the masters bucket. */
export function masterArgs(input: string, out: string, format: 'wav' | 'aiff'): string[] {
  return [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', input,
    '-map', '0:a:0', '-map_metadata', '0',
    '-c:a', format === 'wav' ? 'pcm_s24le' : 'pcm_s24be',
    out,
  ];
}

export async function ffmpeg(args: string[]): Promise<void> {
  try {
    await run(ffmpegPath(), args, { maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  } catch (err: any) {
    throw new Error(`ffmpeg failed: ${(err?.stderr || err?.message || String(err)).toString().trim().slice(0, 800)}`);
  }
}

/** Reads basic stream info from `ffmpeg -i` (no ffprobe needed). */
export async function probe(file: string): Promise<{ durationSeconds: number; bitrateKbps: number | null; sampleRate: number | null }> {
  let stderr = '';
  try {
    await run(ffmpegPath(), ['-hide_banner', '-i', file], { windowsHide: true });
  } catch (err: any) {
    stderr = String(err?.stderr ?? ''); // `-i` with no output always "fails"; the info is on stderr
  }
  const d = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!d) throw new Error(`Could not read audio from ${file}`);
  const br = stderr.match(/Audio:.*?(\d+)\s*kb\/s/);
  const sr = stderr.match(/Audio:.*?(\d+)\s*Hz/);
  return {
    durationSeconds: Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]),
    bitrateKbps: br ? Number(br[1]) : null,
    sampleRate: sr ? Number(sr[1]) : null,
  };
}
