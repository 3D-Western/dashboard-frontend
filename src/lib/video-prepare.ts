import type { VideoInfo } from '@/lib/video-upload';
import type { VideoWarning } from '@/lib/video-warnings';

/**
 * A step between choosing a video and uploading it. Today it hands the file back unchanged.
 *
 * This is the hook for automatic compression (a separate task): a preparer receives the chosen
 * file with what we learned about it and the warnings it drew, and returns the file to upload,
 * for example a 720p re-encode. Register one with [setVideoPreparer]; the uploader calls
 * [prepareVideo] before every upload and shows the result's name and size.
 */
export type VideoPreparer = (
  file: File,
  info: VideoInfo,
  warnings: VideoWarning[],
  signal?: AbortSignal,
) => Promise<File>;

const unchanged: VideoPreparer = async (file) => file;

let preparer: VideoPreparer = unchanged;

/** Installs a preparer (pass nothing to go back to uploading files as they are). */
export function setVideoPreparer(next?: VideoPreparer) {
  preparer = next ?? unchanged;
}

export function prepareVideo(
  file: File,
  info: VideoInfo,
  warnings: VideoWarning[],
  signal?: AbortSignal,
): Promise<File> {
  return preparer(file, info, warnings, signal);
}
