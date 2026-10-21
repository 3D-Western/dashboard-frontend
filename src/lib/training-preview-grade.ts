import type { Question, QuestionType } from '@/types/training';
import type { PreviewAnswerKey } from '@/types/training-preview';

/**
 * Grading for the staff preview, which runs in the browser. It follows the server's `QuizGrader`
 * (same rules, so a question behaves in the preview as it will for a student):
 * - one-answer questions are right when exactly one option is picked and it is correct or accepted;
 * - "pick all" questions are right when every correct option is picked and nothing outside the
 *   correct and accepted options;
 * - a question a correction dropped is neither scored nor critical;
 * - a pass needs every critical question right AND the score at or above the pass mark, and a quiz
 *   with nothing to grade never passes.
 */
export function isAnswerCorrect(
  key: PreviewAnswerKey,
  type: QuestionType,
  selected: readonly number[],
): boolean {
  const picked = new Set(selected);
  const correct = new Set(key.correctOptionIds);
  const accepted = new Set([...key.correctOptionIds, ...key.acceptedOptionIds]);
  switch (type) {
    case 'SINGLE':
    case 'TRUE_FALSE': {
      if (picked.size !== 1) return false;
      const [only] = [...picked];
      return accepted.has(only);
    }
    case 'MULTI':
      return (
        [...correct].every((id) => picked.has(id)) && [...picked].every((id) => accepted.has(id))
      );
    default:
      return false;
  }
}

export interface PreviewGrade {
  scorePercent: number;
  correctCount: number;
  totalCount: number;
  criticalAllCorrect: boolean;
  passed: boolean;
  /** Per question version: was it right (dropped questions are absent). */
  correctByQuestion: Record<number, boolean>;
  /** Step positions to go back to, from the missed questions' remediation pointers. */
  reviewStepPositions: number[];
}

export function gradePreviewQuiz(
  questions: readonly Question[],
  answers: Readonly<Record<number, number[]>>,
  keys: ReadonlyMap<number, PreviewAnswerKey>,
  passMarkPercent: number,
): PreviewGrade {
  const scored = questions.filter((q) => !keys.get(q.questionVersionId)?.dropped);
  const correctByQuestion: Record<number, boolean> = {};
  for (const question of scored) {
    const key = keys.get(question.questionVersionId);
    correctByQuestion[question.questionVersionId] = key
      ? isAnswerCorrect(key, question.type, answers[question.questionVersionId] ?? [])
      : false;
  }
  const total = scored.length;
  const correctCount = scored.filter((q) => correctByQuestion[q.questionVersionId]).length;
  const criticalAllCorrect = scored
    .filter((q) => keys.get(q.questionVersionId)?.critical)
    .every((q) => correctByQuestion[q.questionVersionId]);
  // Whole numbers on both sides, so rounding in the displayed score can never flip a pass.
  const meetsMark = total > 0 && correctCount * 100 >= passMarkPercent * total;
  const reviewStepPositions = [
    ...new Set(
      scored
        .filter((q) => !correctByQuestion[q.questionVersionId])
        .map((q) => keys.get(q.questionVersionId)?.remediationStepPosition)
        .filter((position): position is number => typeof position === 'number'),
    ),
  ].sort((a, b) => a - b);
  return {
    scorePercent: total === 0 ? 0 : Math.round((correctCount * 10000) / total) / 100,
    correctCount,
    totalCount: total,
    criticalAllCorrect,
    passed: criticalAllCorrect && meetsMark,
    correctByQuestion,
    reviewStepPositions,
  };
}
