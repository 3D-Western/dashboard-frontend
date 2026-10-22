import type { TimeRange, VideoCheckpoint } from '@/types/training';

/** Seconds of slack when comparing playback positions (timeupdate only fires a few times a second). */
export const SEEK_TOLERANCE_SECONDS = 1;

const round = (value: number) => Math.round(value * 1000) / 1000;

/** Sorts ranges and joins the ones that touch or overlap. */
export function mergeRanges(ranges: TimeRange[], gap = 0.05): TimeRange[] {
  const sorted = ranges
    .filter((r) => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start)
    .map((r) => ({ start: r.start, end: r.end }))
    .sort((a, b) => a.start - b.start);
  const merged: TimeRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end + gap) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push(range);
    }
  }
  return merged;
}

/**
 * Records which seconds of the video were really played, as ranges.
 *
 * `sample()` is called for each `timeupdate` while the video plays. A sample close to the previous
 * one extends the current range; a jump (a seek, a replay from an earlier point) closes the range
 * and starts a new one, so skipped-over seconds are never claimed as watched.
 */
export class WatchTracker {
  private ranges: TimeRange[] = [];
  private segment: TimeRange | null = null;

  /** [maxStep] is the largest forward step (in seconds of video) still treated as continuous play. */
  constructor(private readonly maxStep = 2) {}

  sample(time: number, playbackRate = 1): void {
    if (!Number.isFinite(time)) return;
    const step = this.maxStep + Math.max(playbackRate, 1);
    const seg = this.segment;
    if (seg && time >= seg.end && time - seg.end <= step) {
      seg.end = time;
    } else {
      this.breakSegment();
      this.segment = { start: time, end: time };
    }
  }

  /** Closes the current range (call on seeks, pauses and the end). */
  breakSegment(): void {
    const seg = this.segment;
    this.segment = null;
    if (seg && seg.end > seg.start) {
      this.ranges = mergeRanges([...this.ranges, seg]);
    }
  }

  /** Every range played so far, merged, including the one in progress. Cumulative. */
  snapshot(): TimeRange[] {
    const open = this.segment && this.segment.end > this.segment.start ? [this.segment] : [];
    return mergeRanges([...this.ranges, ...open]).map((r) => ({
      start: round(r.start),
      end: round(r.end),
    }));
  }
}

/** The furthest point already watched: the end of the last range the server knows about. */
export function furthestWatched(ranges: TimeRange[]): number {
  return ranges.reduce((max, r) => Math.max(max, r.end), 0);
}

/** The first checkpoint the learner has not answered correctly yet, by position in the video. */
export function firstOpenCheckpoint(
  checkpoints: VideoCheckpoint[],
  passed: ReadonlySet<number>,
): VideoCheckpoint | null {
  const open = checkpoints
    .filter((c) => !c.passed && !passed.has(c.checkpointId))
    .sort((a, b) => a.atSeconds - b.atSeconds);
  return open[0] ?? null;
}

/**
 * How far forward the learner may seek: no further than they have already watched, and never
 * past a checkpoint they still have to answer. Backward seeking is always free.
 */
export function seekLimit(furthest: number, openCheckpoint: VideoCheckpoint | null): number {
  const limit = openCheckpoint ? Math.min(furthest, openCheckpoint.atSeconds) : furthest;
  return limit + SEEK_TOLERANCE_SECONDS;
}
