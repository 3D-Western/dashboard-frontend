import { beforeEach, describe, expect, it } from 'vitest';
import {
  QUALITY_REASONS,
  SKIP_MEMORY_MS,
  aftercareStep,
  findPendingRating,
  nextQuestion,
  rememberFollowupSkipped,
  rememberRated,
  rememberRatingSkipped,
  skippedFollowups,
  wasRated,
  wasRatingSkipped,
} from './pipeline-aftercare';

beforeEach(() => window.localStorage.clear());

const job = (overrides: Record<string, unknown> = {}) => ({
  id: 'job-1',
  name: 'Hinge Pair',
  studentStatus: 'collected' as const,
  rated: false,
  jobPlaced: '2026-11-01T10:00:00Z',
  ...overrides,
});

describe('QUALITY_REASONS', () => {
  it('are exactly the values the pipeline accepts', () => {
    expect(QUALITY_REASONS.map((r) => r.value).sort()).toEqual(
      [
        'broke_on_removal',
        'detail_lost',
        'other',
        'rough_layers',
        'rough_surface',
        'stringing',
        'support_marks',
        'warping',
        'weak',
        'wrong_size',
      ].sort(),
    );
  });
});

describe('findPendingRating', () => {
  it('finds a collected job the backend says is unrated', () => {
    expect(findPendingRating([job()])).toEqual({
      jobId: 'job-1',
      jobName: 'Hinge Pair',
      required: false,
    });
  });

  it('passes on the backend’s word that rating blocks the next submission', () => {
    expect(findPendingRating([job({ ratingRequired: true })])?.required).toBe(true);
  });

  it('takes the newest of several unrated jobs', () => {
    const found = findPendingRating([
      job({ id: 'old', jobPlaced: '2026-10-01T10:00:00Z' }),
      job({ id: 'new', jobPlaced: '2026-11-03T10:00:00Z' }),
    ]);
    expect(found?.jobId).toBe('new');
  });

  it.each([
    ['rated', { rated: true }],
    ['not collected', { studentStatus: 'printing' }],
    ['without rating info (older jobs, or a backend without ratings)', { rated: undefined }],
  ])('ignores a job that is %s', (_why, overrides) => {
    expect(findPendingRating([job(overrides)])).toBeNull();
  });

  it('does not ask again about a print this browser already rated', () => {
    rememberRated('job-1');
    expect(findPendingRating([job()])).toBeNull();
  });

  it('does not ask again within a day about a skippable one that was skipped', () => {
    const now = Date.parse('2026-11-04T12:00:00Z');
    rememberRatingSkipped('job-1', now - 60_000);
    expect(findPendingRating([job()], now)).toBeNull();
    expect(findPendingRating([job()], now + SKIP_MEMORY_MS)).not.toBeNull();
  });

  it('asks again about a required one whatever was skipped', () => {
    rememberRatingSkipped('job-1');
    expect(findPendingRating([job({ ratingRequired: true })])).not.toBeNull();
  });
});

describe('browser memory', () => {
  it('remembers a rating and a skip per job', () => {
    expect(wasRated('a')).toBe(false);
    rememberRated('a');
    expect(wasRated('a')).toBe(true);
    expect(wasRated('b')).toBe(false);

    rememberRatingSkipped('a', 1000);
    expect(wasRatingSkipped('a', 2000)).toBe(true);
    expect(wasRatingSkipped('b', 2000)).toBe(false);
  });

  it('remembers skipped follow-up questions without duplicates', () => {
    rememberFollowupSkipped('a', 1);
    rememberFollowupSkipped('a', 1);
    rememberFollowupSkipped('a', 3);
    expect(skippedFollowups('a')).toEqual([1, 3]);
    expect(skippedFollowups('b')).toEqual([]);
  });

  it('survives blocked or corrupt storage', () => {
    window.localStorage.setItem('3dw:followups-skipped:a', '{nope');
    expect(skippedFollowups('a')).toEqual([]);
  });
});

describe('aftercareStep', () => {
  const base = { rated: false, rating: null, qualityHandled: false, unanswered: 2 };

  it('rates first, whatever is waiting', () => {
    expect(aftercareStep(base)).toBe('rate');
  });

  it('offers the quality step after a thumbs-down, once', () => {
    expect(aftercareStep({ ...base, rated: true, rating: 'down' })).toBe('quality');
    expect(aftercareStep({ ...base, rated: true, rating: 'down', qualityHandled: true })).toBe(
      'followups',
    );
  });

  it('goes straight to the questions after a thumbs-up', () => {
    expect(aftercareStep({ ...base, rated: true, rating: 'up' })).toBe('followups');
  });

  it('is done when nothing is left to ask', () => {
    expect(aftercareStep({ ...base, rated: true, rating: 'up', unanswered: 0 })).toBe('done');
  });
});

describe('nextQuestion', () => {
  const questions = [
    { questionId: 1, text: 'a' },
    { questionId: 2, text: 'b' },
  ];

  it('is the first one not handled yet', () => {
    expect(nextQuestion(questions, [])?.questionId).toBe(1);
    expect(nextQuestion(questions, [1])?.questionId).toBe(2);
    expect(nextQuestion(questions, [1, 2])).toBeNull();
    expect(nextQuestion(undefined, [])).toBeNull();
  });
});
