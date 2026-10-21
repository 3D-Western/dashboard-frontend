import { formatClock } from '@/lib/training-format';
import { videoTypeOf } from '@/lib/video-type';
import type { VideoInfo } from '@/lib/video-upload';

/** Training videos should be this long or shorter (D-16). Longer ones are allowed, with a warning. */
export const MAX_VIDEO_SECONDS = 600;
export const MAX_HEIGHT = 1080;
/** Above this, a 10 minute video is more than 375 MB and slow to start on a phone. */
export const MAX_MEGABITS_PER_SECOND = 5;

/** The script that makes a file we like: 720p MP4 with the index at the front. */
export const ENCODE_SCRIPT = 'scripts/encode-training-video.sh';

export interface VideoWarning {
  id: 'long' | 'resolution' | 'bitrate' | 'format';
  /** "strong" is for the one that most affects members: a video that is too long. */
  severity: 'strong' | 'normal';
  message: string;
  /** What to do about it, in one sentence. */
  action: string;
}

/**
 * Things worth a second look about a video file. None of them stops an upload or a publish:
 * the author decides. Each says what to do, because the fix is always the same script.
 */
export function videoWarnings(
  file: { type: string; size: number; name?: string },
  info: VideoInfo,
): VideoWarning[] {
  const warnings: VideoWarning[] = [];
  const type = videoTypeOf(file);
  const seconds = info.durationSeconds;

  if (seconds !== null && seconds > MAX_VIDEO_SECONDS) {
    warnings.push({
      id: 'long',
      severity: 'strong',
      message: `This video is ${formatClock(seconds)} long, more than the 10 minutes we aim for. Long videos lose people, and members who stop halfway have to start over.`,
      action: 'Split it into two steps if you can. You can still upload and publish it as it is.',
    });
  }

  if (info.height !== null && info.height > MAX_HEIGHT) {
    warnings.push({
      id: 'resolution',
      severity: 'normal',
      message: `This video is ${info.width ?? '?'} x ${info.height}, larger than 1080p. It is slow to start on a phone and costs more to store.`,
      action: `Run ${ENCODE_SCRIPT} on it to make a 720p copy, then upload that.`,
    });
  }

  if (seconds !== null && seconds > 0) {
    const megabits = (file.size * 8) / seconds / 1_000_000;
    if (megabits > MAX_MEGABITS_PER_SECOND) {
      warnings.push({
        id: 'bitrate',
        severity: 'normal',
        message: `This video uses about ${megabits.toFixed(1)} Mbps, more than the 5 Mbps that a phone on mobile data handles well.`,
        action: `Run ${ENCODE_SCRIPT} on it to shrink it, then upload the result.`,
      });
    }
  }

  if (type !== 'video/mp4') {
    warnings.push({
      id: 'format',
      severity: 'normal',
      message: `This file is ${type === 'video/quicktime' ? 'a QuickTime (.mov) file' : type === 'video/webm' ? 'a WebM file' : `not an MP4 (${type || 'unknown type'})`}. Some phones and browsers will not play it, or will be slow to start.`,
      action: `Run ${ENCODE_SCRIPT} on it to make an MP4, then upload that. A video that is not an MP4 can be uploaded, but it cannot be published.`,
    });
  }

  return warnings;
}
