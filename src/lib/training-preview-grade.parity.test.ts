import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { createKey } from '@test/utils/trainingPreviewFactories';
import type { Question, QuestionType } from '@/types/training';
import { gradePreviewQuiz } from './training-preview-grade';

/**
 * The preview grades in the browser with a port of the server's `QuizGrader`. Both are run against
 * the same golden file (the backend side is `QuizGraderParityTest`), so a rule cannot change on one
 * side only.
 */
interface GoldenQuestion {
  id: number;
  type: QuestionType;
  critical?: boolean;
  correct: number[];
  accepted?: number[];
  dropped?: boolean;
  remediation?: number;
  selected: number[] | null;
}
interface GoldenCase {
  name: string;
  passMarkPercent: number;
  questions: GoldenQuestion[];
  expected: {
    scorePercent: number;
    correctCount: number;
    totalCount: number;
    criticalAllCorrect: boolean;
    passed: boolean;
    correctByQuestion: Record<string, boolean>;
    reviewStepPositions: number[];
  };
}

const file = path.resolve(__dirname, '../../../dev/fixtures/training-grader-cases.json');
const { cases } = JSON.parse(readFileSync(file, 'utf8')) as { cases: GoldenCase[] };

describe('preview grader parity with the server grader', () => {
  it('has the golden cases', () => {
    expect(cases.length).toBeGreaterThan(10);
  });

  it.each(cases.map((c) => [c.name, c] as const))('%s', (_name, golden) => {
    const questions: Question[] = golden.questions.map((q) => ({
      questionVersionId: q.id,
      type: q.type,
      selection: q.type === 'MULTI' ? 'MULTIPLE' : 'SINGLE',
      promptMarkdown: `Question ${q.id}?`,
      options: [],
    }));
    const keys = new Map(
      golden.questions.map((q) => [
        q.id,
        createKey({
          questionVersionId: q.id,
          correctOptionIds: q.correct,
          acceptedOptionIds: q.accepted ?? [],
          critical: q.critical ?? false,
          dropped: q.dropped ?? false,
          remediationStepPosition: q.remediation ?? null,
        }),
      ]),
    );
    const answers = Object.fromEntries(
      golden.questions.filter((q) => q.selected !== null).map((q) => [q.id, q.selected!]),
    );

    const grade = gradePreviewQuiz(questions, answers, keys, golden.passMarkPercent);

    expect(grade.scorePercent).toBe(golden.expected.scorePercent);
    expect(grade.correctCount).toBe(golden.expected.correctCount);
    expect(grade.totalCount).toBe(golden.expected.totalCount);
    expect(grade.criticalAllCorrect).toBe(golden.expected.criticalAllCorrect);
    expect(grade.passed).toBe(golden.expected.passed);
    expect(grade.correctByQuestion).toEqual(
      Object.fromEntries(
        Object.entries(golden.expected.correctByQuestion).map(([id, value]) => [Number(id), value]),
      ),
    );
    expect(grade.reviewStepPositions).toEqual(golden.expected.reviewStepPositions);
  });
});
