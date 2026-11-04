import { beforeEach, describe, expect, it } from 'vitest';
import {
  QUALITY_REASONS,
  aftercareStep,
  nextQuestion,
  rememberFollowupSkipped,
  rememberRated,
  rememberRatingSkipped,
  skippedFollowups,
  wasRated,
  wasRatingSkipped,
} from './pipeline-aftercare';

beforeEach(() => window.localStorage.clear());

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
