import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_INLINE_FOLLOWUPS,
  QUALITY_REASONS,
  inlineFollowups,
  rememberRated,
  wasRated,
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

describe('what this browser remembers', () => {
  it('remembers a rating per job', () => {
    expect(wasRated('a')).toBe(false);
    rememberRated('a');
    expect(wasRated('a')).toBe(true);
    expect(wasRated('b')).toBe(false);
  });
});

describe('inlineFollowups', () => {
  const questions = [1, 2, 3, 4].map((questionId) => ({ questionId, text: `Q${questionId}` }));

  it('shows the first unanswered questions, never more than two', () => {
    expect(MAX_INLINE_FOLLOWUPS).toBe(2);
    expect(inlineFollowups(questions, []).map((q) => q.questionId)).toEqual([1, 2]);
    expect(inlineFollowups(questions, [1]).map((q) => q.questionId)).toEqual([2, 3]);
    expect(inlineFollowups(questions, [1, 2, 3]).map((q) => q.questionId)).toEqual([4]);
  });

  it('is empty when there is nothing left to ask', () => {
    expect(inlineFollowups(questions, [1, 2, 3, 4])).toEqual([]);
    expect(inlineFollowups(undefined, [])).toEqual([]);
  });
});
