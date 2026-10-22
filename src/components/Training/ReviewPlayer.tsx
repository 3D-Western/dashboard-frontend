'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { trainingErrorMessage } from '@/api/client/training-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/Markdown';
import { Skeleton } from '@/components/ui/skeleton';
import { Routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { Attempt, AttemptStep } from '@/types/training';
import { ReviewBanner } from './ReviewBanner';
import { useTrainingRuntime } from './TrainingRuntime';
import { VideoStep } from './VideoStep';

const noop = () => undefined;

/**
 * The student's look back over a failed attempt: the video, the reading text and the attestation
 * text of the version they attempted. Read-only. The sections the failed result pointed to are
 * marked "Revisit". No quiz, no questions, nothing sent to the server beyond reading.
 */
export function ReviewPlayer({
  attemptId,
  initialStepId,
}: {
  attemptId: number;
  /** Open on this section (from a link in the result). Defaults to the first section to revisit. */
  initialStepId?: number | null;
}) {
  const { api, review } = useTrainingRuntime();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async () => {
    try {
      const loaded = await api.getAttempt(attemptId);
      setAttempt(loaded);
      setLoadError(null);
      const revisit = loaded.reviewSteps.map((s) => s.stepId);
      const open =
        loaded.steps.find((s) => s.stepId === initialStepId) ??
        loaded.steps.find((s) => revisit.includes(s.stepId)) ??
        loaded.steps[0] ??
        null;
      setSelectedId(open?.stepId ?? null);
    } catch (error) {
      setLoadError(
        trainingErrorMessage(error, "We couldn't load this material. Please try again."),
      );
    }
  }, [api, attemptId, initialStepId]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    run();
  }, [load]);

  const exitHref = review?.exitHref ?? Routes.training.attempt(attemptId);

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
      <div className="space-y-4" role="status" aria-label="Loading the material">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="aspect-video w-full rounded-xl" />
      </div>
    );
  }

  const revisitIds = new Set(attempt.reviewSteps.map((s) => s.stepId));
  const current = attempt.steps.find((s) => s.stepId === selectedId) ?? null;

  const select = (stepId: number) => {
    setSelectedId(stepId);
    headingRef.current?.focus();
  };

  return (
    <div className="space-y-4">
      {review && <ReviewBanner review={review} />}

      <div className="space-y-6 short:space-y-3">
        <header className="space-y-3 short:space-y-1">
          <h2 className="text-xl">{attempt.trainingTitle}</h2>
          {revisitIds.size > 0 && (
            <p className="text-sm text-muted-foreground">
              The sections marked &quot;Revisit&quot; cover what you missed.
            </p>
          )}
          <ol className="flex flex-wrap gap-2 short:sr-only" aria-label="Sections">
            {attempt.steps.map((step) => (
              <li key={step.stepId}>
                <button
                  type="button"
                  onClick={() => select(step.stepId)}
                  aria-current={step.stepId === selectedId ? 'step' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1 text-sm fine:min-h-8',
                    step.stepId === selectedId &&
                      'border-purple-light bg-purple-light/10 font-medium',
                    revisitIds.has(step.stepId) &&
                      step.stepId !== selectedId &&
                      'border-status-yellow/60 bg-status-yellow/10',
                  )}
                >
                  <span>{step.title}</span>
                  {revisitIds.has(step.stepId) && (
                    <span className="rounded-full bg-status-yellow/25 px-1.5 text-xs font-medium">
                      Revisit
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </header>

        {current ? (
          <section aria-labelledby="review-heading" className="space-y-4 short:space-y-0">
            <h3
              id="review-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-semibold outline-none short:sr-only"
            >
              {current.title}
            </h3>
            <ReviewBody key={current.stepId} attemptId={attemptId} step={current} />
          </section>
        ) : (
          <Alert>
            <AlertDescription>There is no material to show for this attempt.</AlertDescription>
          </Alert>
        )}

        <footer className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={exitHref}>Back to my results</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full sm:w-auto">
            <Link href={Routes.training.home}>Back to my training</Link>
          </Button>
        </footer>
      </div>
    </div>
  );
}

function ReviewBody({ attemptId, step }: { attemptId: number; step: AttemptStep }) {
  switch (step.type) {
    case 'VIDEO':
      return step.video ? (
        <VideoStep attemptId={attemptId} step={step} onStepCompleted={noop} />
      ) : null;
    case 'READING':
      return step.reading ? <Markdown>{step.reading.bodyMarkdown}</Markdown> : null;
    case 'ATTESTATION':
      return step.attestation ? (
        <div className="rounded-lg border bg-card p-4">
          <Markdown>{step.attestation.text}</Markdown>
        </div>
      ) : null;
    default:
      return null;
  }
}
