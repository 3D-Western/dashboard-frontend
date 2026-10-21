'use client';

import Link from 'next/link';
import { CheckCircle2, ClipboardList, XCircle } from 'lucide-react';
import { blockedMessage } from '@/api/client/training-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InstallPrompt } from '@/components/InstallPrompt/InstallPrompt';
import { Button } from '@/components/ui/button';
import { useMyTrainings } from '@/hooks/useMyTrainings';
import { useStartTraining } from '@/hooks/useStartTraining';
import { formatDate, formatWhen } from '@/lib/training-format';
import { Routes } from '@/lib/routes';
import type { Attempt, CertificationStatus, QuizResult, TrainingSummary } from '@/types/training';

interface AttemptResultsProps {
  attempt: Attempt;
  /** Present right after submitting the quiz in this session; absent when reopening a finished attempt. */
  quizResult: QuizResult | null;
}

/**
 * How a finished attempt went. It shows pass or fail, the score and which sections to go back
 * to. It never shows which questions were right or wrong: the server doesn't send that, and a
 * fail points at material rather than answers.
 */
export function AttemptResults({ attempt, quizResult }: AttemptResultsProps) {
  const { data, refetch } = useMyTrainings();
  const { start, startingSlug, error } = useStartTraining(refetch);
  const training = data?.trainings.find((t) => t.slug === attempt.trainingSlug) ?? null;

  if (attempt.status === 'ABANDONED') {
    return (
      <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-xl">This attempt was cancelled</h2>
        <p className="text-sm text-muted-foreground">
          It doesn&apos;t count against your attempts. You can start again whenever you&apos;re
          ready.
        </p>
        <Button asChild className="w-full sm:w-auto">
          <Link href={Routes.training.home}>Back to my training</Link>
        </Button>
      </section>
    );
  }

  const score = quizResult?.scorePercent ?? attempt.scorePercent;
  const scoreText = score === null || score === undefined ? null : `${Math.round(Number(score))}%`;

  if (attempt.status === 'PASSED') {
    const certification =
      quizResult?.certificationStatus ?? training?.certification?.status ?? null;
    return (
      <section
        aria-labelledby="results-heading"
        className="space-y-5 rounded-xl border bg-card p-5 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-8 shrink-0 text-status-green" aria-hidden="true" />
          <h2 id="results-heading" className="text-xl">
            You passed
          </h2>
        </div>
        {scoreText && <p className="text-sm text-muted-foreground">Your score: {scoreText}</p>}
        <p>{passMessage(certification, training)}</p>
        {/* Final note after Maker Orientation: add the app to the home screen (phones only) */}
        {training?.kind === 'ORIENTATION' && (
          <InstallPrompt moment="orientation-passed" variant="note" />
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href={Routes.training.home}>Back to my training</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={Routes.dashboard}>Go to the dashboard</Link>
          </Button>
        </div>
      </section>
    );
  }

  // FAILED
  const reviewSteps = quizResult?.reviewSteps?.length
    ? quizResult.reviewSteps
    : attempt.reviewSteps;
  const criticalMissed = (quizResult?.criticalAllCorrect ?? attempt.criticalAllCorrect) === false;
  const retryAt = quizResult?.retryAt ?? training?.retryAt ?? null;
  const canRetry = training?.nextAction === 'START' || training?.nextAction === 'START_REFRESHER';

  return (
    <section
      aria-labelledby="results-heading"
      className="space-y-5 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <XCircle className="size-8 shrink-0 text-status-red" aria-hidden="true" />
        <h2 id="results-heading" className="text-xl">
          Not passed this time
        </h2>
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        {scoreText && <p>Your score: {scoreText}</p>}
        {quizResult && <p>You need {quizResult.passMarkPercent}% to pass.</p>}
        {criticalMissed && (
          <p>
            At least one safety-critical question was missed. Those must all be answered right,
            whatever your overall score.
          </p>
        )}
      </div>

      {reviewSteps.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <ClipboardList className="size-4" aria-hidden="true" />
            Go back over these sections
          </h3>
          <ol className="list-decimal space-y-1 pl-6 text-sm">
            {reviewSteps.map((step) => (
              <li key={step.stepId}>
                <Link
                  href={Routes.training.review(attempt.attemptId, step.stepId)}
                  className="inline-flex min-h-11 items-center underline fine:min-h-0"
                >
                  {step.title}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {!canRetry && (training?.nextAction === 'BLOCKED' || retryAt) && (
        <p className="text-sm text-muted-foreground">
          {training?.nextAction === 'BLOCKED'
            ? blockedMessage(training)
            : `You can try again ${formatWhen(retryAt!)}. Use the time to review the material.`}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {training && canRetry && (
          <Button
            type="button"
            onClick={() => void start(training.slug)}
            disabled={startingSlug === training.slug}
            className="w-full sm:w-auto"
          >
            {startingSlug === training.slug ? 'Starting...' : 'Try again'}
          </Button>
        )}
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={Routes.training.review(attempt.attemptId)}>Review the material</Link>
        </Button>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={Routes.training.home}>Back to my training</Link>
        </Button>
      </div>
    </section>
  );
}

function passMessage(status: CertificationStatus | null, training: TrainingSummary | null): string {
  switch (status) {
    case 'AWAITING_SIGNOFF':
      return "You've finished the online part. The last step is an in-person sign-off: find a supervisor at the makerspace.";
    case 'ACTIVE': {
      const expires = training?.certification?.expiresAt;
      return expires
        ? `You're certified. Your certification is valid until ${formatDate(expires)}.`
        : "You're certified.";
    }
    default:
      return 'Nice work. Your training is complete.';
  }
}
