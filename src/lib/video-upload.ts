import { trainingAdminAPI } from '@/api/client/training-admin';
import { MAX_VIDEO_SECONDS } from '@/lib/training-step-form';

/** Largest file the server will sign an upload URL for (1 GB). */
export const MAX_VIDEO_BYTES = 1_073_741_824;

/** How long to wait for a file to report its length before giving up on knowing it. */
export const DURATION_PROBE_TIMEOUT_MS = 5000;

/** Why a video of [seconds] cannot be used, or null when it is short enough. */
export function videoLengthProblem(seconds: number | null): string | null {
  if (seconds === null || seconds <= MAX_VIDEO_SECONDS) return null;
  return `This video is ${Math.floor(seconds / 60)} min ${seconds % 60} s long. Videos must be 10 minutes (${MAX_VIDEO_SECONDS} seconds) or less; shorten it or split it into two steps.`;
}

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

/** Why this file cannot be uploaded, or null if it can. */
export function videoFileProblem(file: { type: string; size: number }): string | null {
  if (file.type !== 'video/mp4') {
    return 'Only MP4 videos can be uploaded. Encode the video as MP4 (H.264) first.';
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
    contentType: 'video/mp4',
    sizeBytes: file.size,
  });
  await putToStorage(target.uploadUrl, target.requiredHeaders ?? {}, file, onProgress, signal);
  return target.assetKey;
}

/**
 * The length of a local video in whole seconds (rounded up), read from the file itself. Gives
 * null if the browser cannot read it, or does not answer within [timeoutMs].
 */
export function readVideoDuration(
  file: Blob,
  timeoutMs: number = DURATION_PROBE_TIMEOUT_MS,
): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let done = false;
    const timer = setTimeout(() => finish(null), timeoutMs);
    const finish = (seconds: number | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      resolve(seconds);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () =>
      finish(
        Number.isFinite(video.duration) && video.duration > 0 ? Math.ceil(video.duration) : null,
      );
    video.onerror = () => finish(null);
    video.src = url;
  });
}
