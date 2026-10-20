import { trainingAdminAPI } from '@/api/client/training-admin';

/** Largest file the server will sign an upload URL for (1 GB). */
export const MAX_VIDEO_BYTES = 1_073_741_824;

/** How long to wait for a file to report its length before giving up on knowing it. */
export const DURATION_PROBE_TIMEOUT_MS = 5000;

/** Formats the server will take. MP4 is the one we want; the others only draw a warning. */
export const UPLOADABLE_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;
export type UploadableType = (typeof UPLOADABLE_TYPES)[number];

export class VideoUploadError extends Error {
  constructor(
    message: string,
    public readonly kind: 'aborted' | 'network' | 'rejected',
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'VideoUploadError';
  }
}

/** Headers a browser sets itself; trying to set them throws or is ignored. */
const BROWSER_SET_HEADERS = new Set(['host', 'content-length']);

/** Why this file cannot be uploaded, or null if it can. A format that is merely not ideal is a warning, not a problem. */
export function videoFileProblem(file: { type: string; size: number }): string | null {
  if (!(UPLOADABLE_TYPES as readonly string[]).includes(file.type)) {
    return `This kind of file (${file.type || 'unknown type'}) cannot be uploaded. Run scripts/encode-training-video.sh on it to make an MP4, then upload that.`;
  }
  if (file.size < 1) return 'That file is empty.';
  if (file.size > MAX_VIDEO_BYTES) return 'That video is larger than 1 GB.';
  return null;
}

/** PUTs [file] to a presigned URL with exactly the headers the server signed, reporting progress. */
export function putToStorage(
  url: string,
  headers: Record<string, string>,
  file: Blob,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    for (const [name, value] of Object.entries(headers)) {
      if (!BROWSER_SET_HEADERS.has(name.toLowerCase())) xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
      } else {
        // 403 is how storage says a presigned link is no longer valid.
        const message =
          xhr.status === 403
            ? 'The upload link expired. Try the upload again to get a new one.'
            : `The storage service refused the upload (status ${xhr.status}).`;
        reject(new VideoUploadError(message, 'rejected', xhr.status));
      }
    };
    xhr.onerror = () =>
      reject(
        new VideoUploadError(
          'The upload was interrupted. Check your connection and try again.',
          'network',
        ),
      );
    xhr.onabort = () => reject(new VideoUploadError('The upload was cancelled.', 'aborted'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    if (signal?.aborted) {
      xhr.abort();
      return;
    }
    xhr.send(file);
  });
}

/**
 * Uploads a video: asks the server for a presigned PUT URL, then sends the file straight to
 * storage. Resolves with the `assetKey` to store on the video step.
 */
export async function uploadVideo(
  file: File,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const problem = videoFileProblem(file);
  if (problem) throw new VideoUploadError(problem, 'rejected');
  const target = await trainingAdminAPI.getVideoUploadUrl({
    contentType: file.type as UploadableType,
    sizeBytes: file.size,
  });
  await putToStorage(target.uploadUrl, target.requiredHeaders ?? {}, file, onProgress, signal);
  return target.assetKey;
}

/** What the browser can tell about a local video without uploading it. */
export interface VideoInfo {
  /** Whole seconds, rounded up; null when unknown. */
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
}

const UNKNOWN_VIDEO: VideoInfo = { durationSeconds: null, width: null, height: null };

/**
 * Reads the length and picture size of a local video from the file itself. Gives unknowns if the
 * browser cannot read it, or does not answer within [timeoutMs].
 */
export function readVideoInfo(
  file: Blob,
  timeoutMs: number = DURATION_PROBE_TIMEOUT_MS,
): Promise<VideoInfo> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
      resolve(UNKNOWN_VIDEO);
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let done = false;
    const timer = setTimeout(() => finish(UNKNOWN_VIDEO), timeoutMs);
    const finish = (info: VideoInfo) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      resolve(info);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () =>
      finish({
        durationSeconds:
          Number.isFinite(video.duration) && video.duration > 0 ? Math.ceil(video.duration) : null,
        width: video.videoWidth > 0 ? video.videoWidth : null,
        height: video.videoHeight > 0 ? video.videoHeight : null,
      });
    video.onerror = () => finish(UNKNOWN_VIDEO);
    video.src = url;
  });
}

/** Just the length, in whole seconds (rounded up). */
export async function readVideoDuration(
  file: Blob,
  timeoutMs: number = DURATION_PROBE_TIMEOUT_MS,
): Promise<number | null> {
  return (await readVideoInfo(file, timeoutMs)).durationSeconds;
}
