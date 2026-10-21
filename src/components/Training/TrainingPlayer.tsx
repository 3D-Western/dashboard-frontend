'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { trainingErrorMessage } from '@/api/client/training-errors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { Attempt, AttemptStep, QuizResult } from '@/types/training';
import { AttemptResults } from './AttemptResults';
import { AttestationStep } from './AttestationStep';
import { PledgeScreen } from './PledgeScreen';
import { PreviewBanner } from './PreviewBanner';
import { PreviewFinished } from './PreviewFinished';
import { QuizStep } from './QuizStep';
import { ReadingStep } from './ReadingStep';
import { useTrainingRuntime } from './TrainingRuntime';
import { VideoStep } from './VideoStep';

const STEP_LABELS: Record<AttemptStep['type'], string> = {
  VIDEO: 'Video',
  READING: 'Reading',
  QUIZ: 'Quiz',
  ATTESTATION: 'Confirmation',
};

const KIND_NOTES: Record<Attempt['kind'], string | null> = {
  FULL: null,
  ADDON: 'New material only: you already hold this certification, so just the parts that changed.',
  REFRESHER: 'Refresher: a short re-check of what you learned before.',
};

export function TrainingPlayer({ attemptId }: { attemptId: number }) {
  const { preview } = useTrainingRuntime();
  return (
    <div className="space-y-4">
      {preview && <PreviewBanner preview={preview} />}
      <PlayerBody attemptId={attemptId} />
    </div>
  );
}

function PlayerBody({ attemptId }: { attemptId: number }) {
  const { api, preview } = useTrainingRuntime();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setAttempt(await api.getAttempt(attemptId));
      setLoadError(null);
    } catch (error) {
      setLoadError(
        trainingErrorMessage(error, "We couldn't load this training. Please try again."),
      );
    }
  }, [api, attemptId]);

  useEffect(() => {
    const runLoad = async () => {
      await load();
    };
    runLoad();
  }, [load]);

  // Move keyboard and screen-reader focus to the new step's heading whenever the step changes
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const currentStepId =
    attempt && attempt.status === 'IN_PROGRESS' && !attempt.pledgeRequired
      ? attempt.steps.find((s) => s.status === 'AVAILABLE')?.stepId
      : undefined;
  useEffect(() => {
    if (currentStepId !== undefined) stepHeadingRef.current?.focus();
  }, [currentStepId]);

  // A finished step changes what the attempt looks like (next step unlocked, or the attempt is over)
  const handleStepCompleted = useCallback(() => {
    void load();
  }, [load]);

  const cancelAttempt = async () => {
    setCancelError(null);
    try {
      setAttempt(await api.abandonAttempt(attemptId));
    } catch (error) {
      setCancelError(trainingErrorMessage(error));
    }
  };

  if (loadError && !attempt) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => void load()}>
            Try again
          </Button>
          <Button asChild variant="ghost">
            <Link href={Routes.training.home}>Back to my training</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading training">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="aspect-video w-full rounded-xl" />
      </div>
    );
  }

  if (preview && attempt.status !== 'IN_PROGRESS') {
    return (
      <PreviewFinished
        attempt={attempt}
        exitHref={preview.exitHref}
        onRestart={() => {
          preview.restart();
          setQuizResult(null);
          void load();
        }}
      />
    );
  }

  if (attempt.status !== 'IN_PROGRESS') {
    return <AttemptResults attempt={attempt} quizResult={quizResult} />;
  }

  if (attempt.pledgeRequired) {
    return <PledgeScreen attempt={attempt} onAccepted={setAttempt} />;
  }

  const total = attempt.steps.length;
  const current = attempt.steps.find((s) => s.status === 'AVAILABLE') ?? null;
  const doneCount = attempt.steps.filter((s) => s.status === 'COMPLETED').length;
  const note = KIND_NOTES[attempt.kind];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-xl">{attempt.trainingTitle}</h2>
          {note && <p className="text-sm text-muted-foreground">{note}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {current
                ? `Step ${doneCount + 1} of ${total}`
                : `${doneCount} of ${total} steps done`}
            </span>
            {current && <span className="text-muted-foreground">{STEP_LABELS[current.type]}</span>}
          </div>
          <div
            role="progressbar"
            aria-label="Training progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={doneCount}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full bg-linear-to-r from-purple-dark to-purple-light transition-all motion-reduce:transition-none"
              style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
            />
          </div>
          <ol className="flex flex-wrap gap-2" aria-label="Steps">
            {attempt.steps.map((step) => (
              <li
                key={step.stepId}
                aria-current={step.stepId === current?.stepId ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                  step.status === 'COMPLETED' && 'border-status-green/40 bg-status-green/10',
                  step.stepId === current?.stepId &&
                    'border-purple-light bg-purple-light/10 font-medium',
                  step.status === 'LOCKED' && 'text-muted-foreground',
                )}
              >
                {step.status === 'COMPLETED' ? (
                  <Check className="size-3" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">{step.position}</span>
                )}
                <span className="sr-only sm:not-sr-only">{step.title}</span>
                <span className="sr-only">
                  {step.status === 'COMPLETED'
                    ? ' (done)'
                    : step.status === 'LOCKED'
                      ? ' (locked)'
                      : ' (current)'}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      {current ? (
        <section aria-labelledby="step-heading" className="space-y-4">
          <h3
            id="step-heading"
            ref={stepHeadingRef}
            tabIndex={-1}
            className="text-lg font-semibold outline-none"
          >
            {current.title}
          </h3>
          <StepBody
            key={current.stepId}
            attemptId={attemptId}
            step={current}
            onStepCompleted={handleStepCompleted}
            onQuizSubmitted={(result) => {
              setQuizResult(result);
              void load();
            }}
          />
        </section>
      ) : (
        <Alert>
          <AlertDescription>
            Finishing up...{' '}
            <Button type="button" variant="link" className="h-auto p-0" onClick={() => void load()}>
              Check again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription className="space-y-2">
            <span>{loadError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {preview ? (
        <footer className="space-y-2 border-t pt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={() => {
                preview.skipStep();
                void load();
              }}
              disabled={!current}
            >
              Skip this step
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 text-muted-foreground sm:min-h-9"
              onClick={() => {
                preview.restart();
                setQuizResult(null);
                void load();
              }}
            >
              Start the preview over
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Skipping is for staff only: a student has to finish each step to reach the next.
          </p>
        </footer>
      ) : (
        <footer className="border-t pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
                Cancel this attempt
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this attempt?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your progress in this attempt will be lost and you&apos;ll start from the
                  beginning next time. It won&apos;t count against your attempts. To just take a
                  break, leave this page instead: your place is saved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep going</AlertDialogCancel>
                <AlertDialogAction onClick={() => void cancelAttempt()}>
                  Cancel attempt
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {cancelError && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>{cancelError}</AlertDescription>
            </Alert>
          )}
        </footer>
      )}
    </div>
  );
}

function StepBody({
  attemptId,
  step,
  onStepCompleted,
  onQuizSubmitted,
}: {
  attemptId: number;
  step: AttemptStep;
  onStepCompleted: () => void;
  onQuizSubmitted: (result: QuizResult) => void;
}) {
  switch (step.type) {
    case 'VIDEO':
      return step.video ? (
        <VideoStep attemptId={attemptId} step={step} onStepCompleted={onStepCompleted} />
      ) : null;
    case 'READING':
      return step.reading ? (
        <ReadingStep attemptId={attemptId} step={step} onStepCompleted={onStepCompleted} />
      ) : null;
    case 'ATTESTATION':
      return step.attestation ? (
        <AttestationStep attemptId={attemptId} step={step} onStepCompleted={onStepCompleted} />
      ) : null;
    case 'QUIZ':
      return <QuizStep attemptId={attemptId} step={step} onSubmitted={onQuizSubmitted} />;
    default:
      return null;
  }
}
