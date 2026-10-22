import { describe, it, expect } from 'vitest';
import { createKey, createPreview } from '@test/utils/trainingPreviewFactories';
import type { Question } from '@/types/training';
import type { PreviewAnswerKey } from '@/types/training-preview';
import { gradePreviewQuiz, isAnswerCorrect } from './training-preview-grade';

const keysOf = (...keys: PreviewAnswerKey[]) => new Map(keys.map((k) => [k.questionVersionId, k]));

describe('isAnswerCorrect', () => {
  const key = createKey({ correctOptionIds: [1, 2], acceptedOptionIds: [3] });

  it('a one-answer question needs exactly one pick that is right or accepted', () => {
    const single = createKey({ correctOptionIds: [1], acceptedOptionIds: [3] });
    expect(isAnswerCorrect(single, 'SINGLE', [1])).toBe(true);
    expect(isAnswerCorrect(single, 'SINGLE', [3])).toBe(true);
    expect(isAnswerCorrect(single, 'SINGLE', [2])).toBe(false);
    expect(isAnswerCorrect(single, 'SINGLE', [1, 3])).toBe(false);
    expect(isAnswerCorrect(single, 'SINGLE', [])).toBe(false);
    expect(isAnswerCorrect(single, 'TRUE_FALSE', [1])).toBe(true);
  });

  it('a pick-all question needs every right option and nothing outside right or accepted', () => {
    expect(isAnswerCorrect(key, 'MULTI', [1, 2])).toBe(true);
    expect(isAnswerCorrect(key, 'MULTI', [1, 2, 3])).toBe(true);
    expect(isAnswerCorrect(key, 'MULTI', [1])).toBe(false);
    expect(isAnswerCorrect(key, 'MULTI', [1, 2, 4])).toBe(false);
  });

  it('is never right for a question type the dashboard cannot show', () => {
    expect(isAnswerCorrect(key, 'HOTSPOT', [1, 2])).toBe(false);
  });
});

describe('gradePreviewQuiz', () => {
  const preview = createPreview();
  const questions: Question[] = preview.quizzes[0].questions;
  const keys = keysOf(...preview.answerKey);
  const allRight = { 701: [31], 702: [41, 42], 703: [51] };

  it('passes when everything is right', () => {
    const grade = gradePreviewQuiz(questions, allRight, keys, 90);
    expect(grade).toMatchObject({
      passed: true,
      scorePercent: 100,
      correctCount: 3,
      totalCount: 3,
      criticalAllCorrect: true,
    });
  });

  it('rounds the score to two places but compares whole numbers against the pass mark', () => {
    // 2 of 3 is 66.67%: short of a 67% mark, enough for 66%
    const twoRight = { ...allRight, 701: [32] };
    const grade = gradePreviewQuiz(questions, twoRight, keys, 67);
    expect(grade.scorePercent).toBe(66.67);
    expect(grade.passed).toBe(false);
    expect(gradePreviewQuiz(questions, twoRight, keys, 66).passed).toBe(true);
  });

  it('fails when a critical question is missed, whatever the score', () => {
    const grade = gradePreviewQuiz(questions, { ...allRight, 703: [52] }, keys, 50);
    expect(grade.criticalAllCorrect).toBe(false);
    expect(grade.passed).toBe(false);
    expect(grade.correctCount).toBe(2);
  });

  it('points at the step a missed question sends the student back to', () => {
    const grade = gradePreviewQuiz(questions, { ...allRight, 701: [32] }, keys, 50);
    expect(grade.correctByQuestion[701]).toBe(false);
    expect(grade.reviewStepPositions).toEqual([2]);
  });

  it('leaves a question a correction dropped out of the score', () => {
    const dropped = keysOf(
      ...preview.answerKey.map((k) => (k.questionVersionId === 701 ? { ...k, dropped: true } : k)),
    );
    const grade = gradePreviewQuiz(questions, { 702: [41, 42], 703: [51] }, dropped, 100);
    expect(grade.totalCount).toBe(2);
    expect(grade.passed).toBe(true);
  });

  it('never passes a quiz with nothing to grade', () => {
    expect(gradePreviewQuiz([], {}, keys, 90)).toMatchObject({
      passed: false,
      scorePercent: 0,
      totalCount: 0,
    });
  });
});
