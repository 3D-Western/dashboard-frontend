'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/api/client/errors';
import { trainingErrorMessage } from '@/api/client/training-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AttemptStep, Question, QuizAnswer, QuizResult } from '@/types/training';
import type { QuizReveal } from '@/types/training-preview';
import { QuestionCard } from './QuestionCard';
import { QuizRevealView } from './QuizRevealView';
import { useTrainingRuntime } from './TrainingRuntime';

interface QuizStepProps {
  attemptId: number;
  step: AttemptStep;
  /** Called with the graded result once the quiz is submitted. */
  onSubmitted: (result: QuizResult) => void;
}

type Answers = Record<number, number[]>;

const toList = (answers: Answers): QuizAnswer[] =>
  Object.entries(answers)
    .filter(([, optionIds]) => optionIds.length > 0)
    .map(([questionVersionId, optionIds]) => ({
      questionVersionId: Number(questionVersionId),
      optionIds,
    }));

/**
 * The quiz: one question at a time (easy on a phone). Answers are saved on the server as you go,
 * so you can leave and pick up later; nothing is graded until you submit. The server grades,
 * and never tells us which answers were right.
 */
export function QuizStep({ attemptId, step, onSubmitted }: QuizStepProps) {
  const { api, preview } = useTrainingRuntime();
  const stepId = step.stepId;
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<QuizReveal | null>(null);
  const [retaking, setRetaking] = useState(false);
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const quiz = await api.openQuiz(attemptId, stepId);
      const restored: Answers = {};
      for (const question of quiz.questions) {
        if (question.selectedOptionIds?.length) {
          restored[question.questionVersionId] = question.selectedOptionIds;
        }
      }
      setQuestions(quiz.questions);
      setAnswers(restored);
      // Resume at the first question still blank
      const firstBlank = quiz.questions.findIndex((q) => !restored[q.questionVersionId]);
      setIndex(firstBlank === -1 ? 0 : firstBlank);
    } catch (error) {
      setLoadError(trainingErrorMessage(error, "We couldn't load the quiz. Please try again."));
    }
  }, [api, attemptId, stepId]);

  useEffect(() => {
    const runLoad = async () => {
      await load();
    };
    runLoad();
  }, [load]);

  // Saves are queued so two quick taps can never arrive out of order.
  const save = useCallback(
    (next: Answers) => {
      setSaveState('saving');
      const run = saveChain.current
        .catch(() => undefined)
        .then(() => api.saveQuizAnswers(attemptId, stepId, toList(next)));
      saveChain.current = run;
      run.then(
        () => {
          if (saveChain.current === run) setSaveState('saved');
        },
        () => {
          if (saveChain.current === run) setSaveState('failed');
        },
      );
      return run;
    },
    [api, attemptId, stepId],
  );

  if (loadError) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!questions) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading quiz">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const question = questions[index];
  const answeredCount = questions.filter((q) => answers[q.questionVersionId]?.length).length;
  const blank = questions.length - answeredCount;
  const isLast = index === questions.length - 1;

  const choose = (optionIds: number[]) => {
    const next = { ...answers, [question.questionVersionId]: optionIds };
    setAnswers(next);
    setSubmitError(null);
    void save(next);
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Wait for any save still on its way, then send the answers with the submit as well
      await saveChain.current.catch(() => undefined);
      const result = await api.submitQuiz(attemptId, stepId, toList(answers));
      if (preview) {
        // Staff preview: stay here and show which answers were right. Moving on is a separate tap.
        setReveal(preview.quizReveal(stepId));
        setSubmitting(false);
        return;
      }
      onSubmitted(result);
      // Stay locked after a successful submit: the player reloads the attempt and replaces this
      // screen, and until it has, a second tap must not submit again.
    } catch (error) {
      setSubmitting(false);
      setSubmitError(trainingErrorMessage(error));
      if (error instanceof ApiError && error.code === 'QUIZ_INCOMPLETE') {
        const firstBlank = questions.findIndex((q) => !answers[q.questionVersionId]);
        if (firstBlank !== -1) setIndex(firstBlank);
      }
    }
  };

  if (preview && reveal) {
    return (
      <QuizRevealView
        reveal={reveal}
        retaking={retaking}
        onRetake={() => {
          setRetaking(true);
          void preview
            .retakeQuiz(stepId)
            .then(load)
            .finally(() => {
              setReveal(null);
              setRetaking(false);
            });
        }}
        onContinue={() => {
          preview.finishQuiz(stepId);
          onSubmitted(reveal.result);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span aria-live="polite">
            {saveState === 'saving' && 'Saving...'}
            {saveState === 'saved' && 'Answers saved'}
            {saveState === 'failed' && "Couldn't save. We'll try again on your next answer."}
          </span>
        </div>
        <ol className="flex flex-wrap gap-1.5" aria-label="Questions">
          {questions.map((q, i) => {
            const done = !!answers[q.questionVersionId]?.length;
            return (
              <li key={q.questionVersionId}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Question ${i + 1}${done ? ', answered' : ', not answered'}`}
                  aria-current={i === index ? 'step' : undefined}
                  className={cn(
                    'flex size-11 items-center justify-center rounded-md border text-sm tabular-nums',
                    done && 'border-purple-light bg-purple-light/15',
                    i === index && 'ring-2 ring-purple-light',
                  )}
                >
                  {i + 1}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <QuestionCard
        key={question.questionVersionId}
        question={question}
        selected={answers[question.questionVersionId] ?? []}
        onChange={choose}
        disabled={submitting}
      />

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIndex(index - 1)}
          disabled={index === 0 || submitting}
          className="flex-1 sm:flex-none"
        >
          Back
        </Button>
        {!isLast && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIndex(index + 1)}
            disabled={submitting}
            className="flex-1 sm:flex-none"
          >
            Next
          </Button>
        )}
      </div>

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2 border-t pt-4">
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={blank > 0 || submitting}
          className="w-full sm:w-auto"
        >
          {submitting ? 'Submitting...' : 'Submit quiz'}
        </Button>
        <p className="text-sm text-muted-foreground">
          {blank > 0
            ? `${blank} ${blank === 1 ? 'question is' : 'questions are'} still blank. Your answers are saved as you go.`
            : 'Every question is answered. You can still change answers before you submit.'}
        </p>
      </div>
    </div>
  );
}
