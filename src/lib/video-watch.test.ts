import { describe, it, expect } from 'vitest';
import {
  SEEK_TOLERANCE_SECONDS,
  WatchTracker,
  firstOpenCheckpoint,
  furthestWatched,
  mergeRanges,
  seekLimit,
} from './video-watch';
import { createCheckpoint } from '@test/utils/trainingFactories';

describe('mergeRanges', () => {
  it('joins overlapping and touching ranges and drops empty ones', () => {
    expect(
      mergeRanges([
        { start: 10, end: 20 },
        { start: 0, end: 5 },
        { start: 5, end: 8 },
        { start: 15, end: 30 },
        { start: 40, end: 40 },
      ]),
    ).toEqual([
      { start: 0, end: 8 },
      { start: 10, end: 30 },
    ]);
  });

  it('ignores non-finite values', () => {
    expect(mergeRanges([{ start: NaN, end: 4 }])).toEqual([]);
  });
});

describe('WatchTracker', () => {
  it('extends one range while time moves forward steadily', () => {
    const tracker = new WatchTracker();
    [0, 0.25, 0.5, 0.75, 1].forEach((t) => tracker.sample(t));
    expect(tracker.snapshot()).toEqual([{ start: 0, end: 1 }]);
  });

  it('starts a new range after a jump, so skipped seconds are not claimed', () => {
    const tracker = new WatchTracker();
    [0, 1, 2].forEach((t) => tracker.sample(t));
    [60, 61, 62].forEach((t) => tracker.sample(t));
    expect(tracker.snapshot()).toEqual([
      { start: 0, end: 2 },
      { start: 60, end: 62 },
    ]);
  });

  it('starts a new range when playback goes backwards (a replay)', () => {
    const tracker = new WatchTracker();
    [10, 11, 12].forEach((t) => tracker.sample(t));
    [5, 6, 7].forEach((t) => tracker.sample(t));
    expect(tracker.snapshot()).toEqual([
      { start: 5, end: 7 },
      { start: 10, end: 12 },
    ]);
  });

  it('allows bigger steps at higher playback speeds', () => {
    const tracker = new WatchTracker();
    tracker.sample(0, 4);
    tracker.sample(4, 4);
    tracker.sample(8, 4);
    expect(tracker.snapshot()).toEqual([{ start: 0, end: 8 }]);
  });

  it('breakSegment closes the open range and keeps it', () => {
    const tracker = new WatchTracker();
    [0, 1].forEach((t) => tracker.sample(t));
    tracker.breakSegment();
    [1, 2].forEach((t) => tracker.sample(t));
    expect(tracker.snapshot()).toEqual([{ start: 0, end: 2 }]);
  });

  it('is cumulative: earlier ranges stay in later snapshots', () => {
    const tracker = new WatchTracker();
    [0, 1].forEach((t) => tracker.sample(t));
    tracker.breakSegment();
    const first = tracker.snapshot();
    [30, 31].forEach((t) => tracker.sample(t));
    expect(tracker.snapshot()).toEqual([...first, { start: 30, end: 31 }]);
  });
});

describe('seeking limits', () => {
  it('furthestWatched is the end of the last watched range', () => {
    expect(furthestWatched([])).toBe(0);
    expect(
      furthestWatched([
        { start: 0, end: 40 },
        { start: 60, end: 75 },
      ]),
    ).toBe(75);
  });

  it('lets the learner seek a little past the furthest point, never far beyond', () => {
    expect(seekLimit(30, null)).toBe(30 + SEEK_TOLERANCE_SECONDS);
  });

  it('never lets the learner seek past a checkpoint they have not answered', () => {
    const checkpoint = createCheckpoint({ atSeconds: 20 });
    expect(seekLimit(90, checkpoint)).toBe(20 + SEEK_TOLERANCE_SECONDS);
  });

  it('firstOpenCheckpoint skips passed ones, locally and on the server', () => {
    const a = createCheckpoint({ checkpointId: 1, atSeconds: 10, passed: true });
    const b = createCheckpoint({ checkpointId: 2, atSeconds: 30 });
    const c = createCheckpoint({ checkpointId: 3, atSeconds: 50 });
    expect(firstOpenCheckpoint([c, b, a], new Set())?.checkpointId).toBe(2);
    expect(firstOpenCheckpoint([c, b, a], new Set([2]))?.checkpointId).toBe(3);
    expect(firstOpenCheckpoint([a], new Set())).toBeNull();
  });
});
