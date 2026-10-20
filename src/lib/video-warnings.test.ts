import { describe, it, expect } from 'vitest';
import { videoWarnings } from './video-warnings';

const mp4 = (size = 5_000_000) => ({ type: 'video/mp4', size });
const info = (
  durationSeconds: number | null,
  width: number | null = 1280,
  height: number | null = 720,
) => ({
  durationSeconds,
  width,
  height,
});

describe('videoWarnings', () => {
  it('has nothing to say about a 720p MP4 of reasonable weight', () => {
    expect(videoWarnings(mp4(), info(300))).toEqual([]);
  });

  it('exactly 10 minutes and exactly 1080p are fine', () => {
    expect(videoWarnings(mp4(10_000_000), info(600, 1920, 1080))).toEqual([]);
  });

  it('warns strongly about a video over ten minutes and says what to do', () => {
    const [warning] = videoWarnings(mp4(), info(601));

    expect(warning).toMatchObject({ id: 'long', severity: 'strong' });
    expect(warning.message).toContain('10:01 long');
    expect(warning.action).toMatch(/split it into two steps/i);
    expect(warning.action).toMatch(/still upload and publish/i);
  });

  it('warns about a picture above 1080p', () => {
    const [warning] = videoWarnings(mp4(), info(60, 3840, 2160));

    expect(warning).toMatchObject({ id: 'resolution', severity: 'normal' });
    expect(warning.message).toContain('3840 x 2160');
    expect(warning.action).toContain('scripts/encode-training-video.sh');
  });

  it('warns about a bitrate over 5 Mbps from the file size and length', () => {
    // 10 MB over 10 seconds is 8 Mbps
    const [warning] = videoWarnings(mp4(10_000_000), info(10));

    expect(warning).toMatchObject({ id: 'bitrate' });
    expect(warning.message).toContain('8.0 Mbps');
    expect(warning.action).toContain('scripts/encode-training-video.sh');
    // 5 MB over 10 s is 4 Mbps: fine
    expect(videoWarnings(mp4(5_000_000), info(10))).toEqual([]);
  });

  it('warns about a file that is not an MP4, by name when it can', () => {
    const mov = videoWarnings({ type: 'video/quicktime', size: 1000 }, info(60))[0];
    const webm = videoWarnings({ type: 'video/webm', size: 1000 }, info(60))[0];
    const other = videoWarnings({ type: 'video/x-flv', size: 1000 }, info(60))[0];

    expect(mov.message).toContain('QuickTime (.mov)');
    expect(webm.message).toContain('WebM');
    expect(other.message).toContain('video/x-flv');
    expect(mov.action).toContain('scripts/encode-training-video.sh');
  });

  it('can warn about several things at once, and only about what it knows', () => {
    const many = videoWarnings(
      { type: 'video/quicktime', size: 900_000_000 },
      info(900, 3840, 2160),
    );
    expect(many.map((w) => w.id)).toEqual(['long', 'resolution', 'bitrate', 'format']);

    expect(videoWarnings(mp4(900_000_000), info(null, null, null))).toEqual([]);
  });
});
