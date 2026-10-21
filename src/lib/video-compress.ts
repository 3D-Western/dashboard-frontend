import type { StreamTargetChunk } from 'mediabunny';
import { videoTypeOf } from '@/lib/video-type';
import type { VideoInfo } from '@/lib/video-upload';
import { ENCODE_SCRIPT, MAX_MEGABITS_PER_SECOND } from '@/lib/video-warnings';

/**
 * Compressing a training video in the staff member's own browser, so nobody needs ffmpeg and it
 * costs us nothing to run. The settings match `scripts/encode-training-video.sh`: an MP4 with
 * H.264 video no taller than 720 pixels, AAC audio, and the index at the front ("faststart") so a
 * phone can start playing and seeking at once.
 *
 * The work is done by Mediabunny (WebCodecs, the browser's own video encoder). It is loaded with a
 * dynamic import, only when a file is chosen on the upload screen, so no other page pays for it.
 * The input file is read in pieces from disk, never loaded whole. The result cannot be streamed
 * out as it is made: an MP4 with the index at the front needs the whole index before the first byte
 * is final, so Mediabunny keeps the encoded media in memory until the end (about 160 MB for ten
 * minutes at the target rate). It then hands it over in chunks, which become the `File` without
 * being joined into one more buffer. Because that memory is real, files whose result would be large
 * are not compressed here at all (see `compressionLimit`).
 */

/** Same ceiling as the script: scale down to 720 pixels tall, never enlarge. */
export const TARGET_HEIGHT = 720;
/** The script's `-maxrate 2M`. */
export const TARGET_VIDEO_BITRATE = 2_000_000;
/** The script's `-b:a 128k`. */
export const TARGET_AUDIO_BITRATE = 128_000;
/** An MP4 above this total rate is worth offering a compression for (target plus audio, rounded up). */
export const OFFER_MEGABITS_PER_SECOND = 2.5;
/** A source larger than this is not compressed in the browser. */
export const MAX_COMPRESS_SOURCE_BYTES = 1_500_000_000;
/**
 * A result expected to be larger than this is not compressed in the browser, because the encoded
 * media is held in memory until the file is complete. At the target rate that is about 25 minutes.
 */
export const MAX_COMPRESS_OUTPUT_BYTES = 400_000_000;
/** Above this total rate (target video plus audio) the pictures are re-encoded, not copied. */
export const REENCODE_ABOVE_MEGABITS = (TARGET_VIDEO_BITRATE + TARGET_AUDIO_BITRATE) / 1_000_000;

export type CompressionReason = 'format' | 'resolution' | 'bitrate';

export interface CompressionAdvice {
  /**
   * `required`: the file is not what we want (not an MP4, taller than 720 pixels, or heavier than
   * the bitrate threshold), so it is compressed automatically.
   * `offered`: it could be smaller, or we could not read it well enough to say; staff choose.
   * `unneeded`: already a light 720p-or-smaller MP4; it just uploads.
   */
  mode: 'required' | 'offered' | 'unneeded';
  reasons: CompressionReason[];
}

/** Whether, and how firmly, to compress [file], from what the browser could tell about it. */
export function compressionAdvice(
  file: { type: string; size: number; name?: string },
  info: VideoInfo,
): CompressionAdvice {
  const reasons: CompressionReason[] = [];
  if (videoTypeOf(file) !== 'video/mp4') reasons.push('format');
  if (info.height !== null && info.height > TARGET_HEIGHT) reasons.push('resolution');

  const seconds = info.durationSeconds;
  const megabits = seconds !== null && seconds > 0 ? (file.size * 8) / seconds / 1_000_000 : null;
  if (megabits !== null && megabits > MAX_MEGABITS_PER_SECOND) reasons.push('bitrate');
  if (reasons.length > 0) return { mode: 'required', reasons };

  if (megabits !== null && megabits > OFFER_MEGABITS_PER_SECOND) {
    return { mode: 'offered', reasons: ['bitrate'] };
  }
  // We could not read its size or length: we cannot tell, so let staff decide.
  if (megabits === null || info.height === null) return { mode: 'offered', reasons: [] };
  return { mode: 'unneeded', reasons: [] };
}

/** True when the whole file's bitrate is above the target, so its pictures must be re-encoded. */
export function aboveTargetBitrate(
  file: { size: number },
  info: Pick<VideoInfo, 'durationSeconds'>,
): boolean {
  const seconds = info.durationSeconds;
  if (seconds === null || seconds <= 0) return false;
  return (file.size * 8) / seconds / 1_000_000 > REENCODE_ABOVE_MEGABITS;
}

/**
 * Whether [file] is too big to compress safely in a browser, judged by size and not only by
 * length: the source itself, or the result we expect from it (the smaller of the source size and
 * what the target rate gives for its length).
 */
export function compressionLimit(
  file: { size: number },
  info: Pick<VideoInfo, 'durationSeconds'>,
): 'too-large' | null {
  if (file.size > MAX_COMPRESS_SOURCE_BYTES) return 'too-large';
  const seconds = info.durationSeconds;
  const atTargetRate =
    seconds !== null && seconds > 0
      ? (seconds * (TARGET_VIDEO_BITRATE + TARGET_AUDIO_BITRATE)) / 8
      : Infinity;
  return Math.min(file.size, atTargetRate) > MAX_COMPRESS_OUTPUT_BYTES ? 'too-large' : null;
}

/** Why this browser cannot compress, in terms staff can act on. */
export type UnsupportedReason = 'no-webcodecs' | 'no-h264' | 'no-aac' | 'too-large' | 'error';

export type CompressionSupport =
  | { supported: true }
  | { supported: false; reason: UnsupportedReason; message: string };

const SCRIPT_ADVICE = `Run ${ENCODE_SCRIPT} on the file instead, then upload the result. You can also upload the original as it is.`;

const UNSUPPORTED_MESSAGES: Record<UnsupportedReason, string> = {
  'no-webcodecs': `This browser cannot compress videos by itself (it lacks the video tools that Chrome, Edge and Safari have). ${SCRIPT_ADVICE}`,
  'no-h264': `This browser has no built-in H.264 video encoder, so it cannot make an MP4 (some Firefox versions are like this). Chrome, Edge or Safari can. ${SCRIPT_ADVICE}`,
  'no-aac': `This browser could not set up the sound encoder, so it cannot make an MP4. ${SCRIPT_ADVICE}`,
  'too-large': `This video is too big to compress safely in a browser: the result would take up more than ${MAX_COMPRESS_OUTPUT_BYTES / 1_000_000} MB of memory while it is made. ${SCRIPT_ADVICE}`,
  error: `Compression could not start in this browser. ${SCRIPT_ADVICE}`,
};

export const unsupported = (reason: UnsupportedReason): CompressionSupport => ({
  supported: false,
  reason,
  message: UNSUPPORTED_MESSAGES[reason],
});

/** True when the browser has the WebCodecs video classes at all. Costs nothing: nothing is loaded. */
export function hasWebCodecs(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';
}

let supportCheck: Promise<CompressionSupport> | null = null;

async function checkSupportOnce(): Promise<CompressionSupport> {
  if (!hasWebCodecs()) return unsupported('no-webcodecs');
  try {
    const { canEncodeVideo, canEncodeAudio } = await import('mediabunny');
    const h264 = await canEncodeVideo('avc', {
      width: 1280,
      height: TARGET_HEIGHT,
      bitrate: TARGET_VIDEO_BITRATE,
    });
    if (!h264) return unsupported('no-h264');

    const aacOptions = { numberOfChannels: 2, sampleRate: 48_000, bitrate: TARGET_AUDIO_BITRATE };
    if (!(await canEncodeAudio('aac', aacOptions))) {
      // Not every browser ships an AAC encoder (Chrome on Linux, for one). A small WebAssembly one
      // fills the gap; it is only fetched here, when it is needed.
      const { registerAacEncoder } = await import('@mediabunny/aac-encoder');
      registerAacEncoder();
      if (!(await canEncodeAudio('aac', aacOptions))) return unsupported('no-aac');
    }
    return { supported: true };
  } catch {
    return unsupported('error');
  }
}

/**
 * Whether this browser can make the MP4 we want. Answers once per page load. Never throws:
 * an unsupported browser gets a plain-language message, and the upload goes ahead regardless.
 */
export function checkCompressionSupport(): Promise<CompressionSupport> {
  supportCheck ??= checkSupportOnce();
  return supportCheck;
}

/** For tests: forget the cached answer. */
export function resetCompressionSupportCheck() {
  supportCheck = null;
}

export class VideoCompressError extends Error {
  constructor(
    message: string,
    public readonly kind: 'aborted' | 'failed',
  ) {
    super(message);
    this.name = 'VideoCompressError';
  }
}

export interface CompressOptions {
  /** 0 to 1, as the work proceeds. */
  onProgress?: (fraction: number) => void;
  /** Aborting stops the work and rejects with a `VideoCompressError` of kind "aborted". */
  signal?: AbortSignal;
  /**
   * Re-encode even when the pictures could be copied unchanged. The pictures are also re-encoded
   * whenever their own bitrate is above the target, whatever this says: copying would keep it.
   */
  forceReencode?: boolean;
}

const roundToEven = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** The name of the compressed copy: `intro.mov` becomes `intro-720p.mp4`. */
export function compressedName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, '') || 'video';
  return `${base}-720p.mp4`;
}

/** A bitrate for a picture of this size: the script's cap, lower for small pictures that need less. */
export function targetBitrate(width: number, height: number): number {
  return Math.min(TARGET_VIDEO_BITRATE, Math.max(400_000, Math.round(width * height * 30 * 0.1)));
}

/**
 * Joins what a stream target received into the parts of a file. Normally the chunks arrive in
 * order and are used as they are; if they ever overlap or leave a gap they are laid into one
 * buffer instead, so the file is right either way.
 */
export function chunksToParts(chunks: StreamTargetChunk[]): Uint8Array<ArrayBuffer>[] {
  const sorted = [...chunks].sort((a, b) => a.position - b.position);
  let end = 0;
  const contiguous = sorted.every((chunk) => {
    const ok = chunk.position === end;
    end += chunk.data.byteLength;
    return ok;
  });
  if (contiguous) return sorted.map((chunk) => chunk.data);
  const size = sorted.reduce((max, c) => Math.max(max, c.position + c.data.byteLength), 0);
  const whole = new Uint8Array(size);
  for (const chunk of sorted) whole.set(chunk.data, chunk.position);
  return [whole];
}

/**
 * Turns [file] into a 720p H.264/AAC MP4 with the index at the front. When the pictures are
 * already H.264, small enough and no heavier than the target rate, they are copied without
 * re-encoding (quick, no quality lost); only the container changes.
 */
export async function compressVideo(file: File, options: CompressOptions = {}): Promise<File> {
  const { onProgress, signal, forceReencode = false } = options;
  const aborted = () => new VideoCompressError('Compression was cancelled.', 'aborted');
  if (signal?.aborted) throw aborted();

  const lib = await import('mediabunny');
  const { ALL_FORMATS, BlobSource, Conversion, ConversionCanceledError, Input } = lib;
  const { Mp4OutputFormat, Output, Quality, StreamTarget } = lib;

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  // The target hands over chunks as the file is finished; they are kept as they come.
  const chunks: StreamTargetChunk[] = [];
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new StreamTarget(
      new WritableStream<StreamTargetChunk>({
        write(chunk) {
          chunks.push(chunk);
        },
      }),
      { chunked: true },
    ),
  });
  let conversion: Awaited<ReturnType<typeof Conversion.init>> | null = null;
  let cancelling: Promise<void> | null = null;
  const cancel = () => {
    cancelling ??= conversion ? conversion.cancel() : Promise.resolve();
    return cancelling;
  };
  const onAbort = () => void cancel().catch(() => {});

  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) {
      throw new VideoCompressError('That file has no video that this browser can read.', 'failed');
    }
    const audioTrack = await input.getPrimaryAudioTrack();

    const sourceWidth = videoTrack.displayWidth;
    const sourceHeight = videoTrack.displayHeight;
    const scaledDown = sourceHeight > TARGET_HEIGHT;
    const width = scaledDown
      ? roundToEven((sourceWidth * TARGET_HEIGHT) / sourceHeight)
      : roundToEven(sourceWidth);
    const height = scaledDown ? TARGET_HEIGHT : roundToEven(sourceHeight);
    const resized = width !== sourceWidth || height !== sourceHeight;

    // Copying keeps the source's bitrate, so anything above the target must be re-encoded.
    const sourceBitrate = await videoTrack
      .computePacketStats(200)
      .then((stats) => stats.averageBitrate)
      .catch(() => null);
    const tooHeavy = sourceBitrate !== null && sourceBitrate > TARGET_VIDEO_BITRATE;

    conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: {
        codec: 'avc',
        // Both sizes keep the shape (only rounded to even), so "fill" cannot stretch anything.
        ...(resized ? { width, height, fit: 'fill' as const } : {}),
        quality: new Quality({ bitrate: targetBitrate(width, height), bitrateMode: 'variable' }),
        forceTranscode: forceReencode || resized || tooHeavy,
      },
      audio: {
        codec: 'aac',
        quality: new Quality({ bitrate: TARGET_AUDIO_BITRATE, bitrateMode: 'variable' }),
        ...(audioTrack && audioTrack.numberOfChannels > 2 ? { numberOfChannels: 2 } : {}),
      },
      showWarnings: false,
    });
    if (!conversion.isValid) {
      throw new VideoCompressError(
        'This browser could not read that video well enough to compress it.',
        'failed',
      );
    }
    conversion.onProgress = (fraction) => onProgress?.(Math.min(1, Math.max(0, fraction)));

    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) throw aborted();
    await conversion.execute();

    const parts = chunksToParts(chunks);
    chunks.length = 0;
    const size = parts.reduce((total, part) => total + part.byteLength, 0);
    if (size === 0) {
      throw new VideoCompressError('Compression produced an empty file.', 'failed');
    }
    onProgress?.(1);
    return new File(parts, compressedName(file.name), { type: 'video/mp4' });
  } catch (error) {
    if (error instanceof VideoCompressError) throw error;
    if (error instanceof ConversionCanceledError || signal?.aborted) throw aborted();
    throw new VideoCompressError(
      error instanceof Error && error.message
        ? `Compression failed: ${error.message}`
        : 'Compression failed.',
      'failed',
    );
  } finally {
    signal?.removeEventListener('abort', onAbort);
    // Wait for a cancellation to finish before letting go of the input it is still reading.
    if (signal?.aborted || cancelling) await cancel().catch(() => {});
    input.dispose();
  }
}
