'use client';

import { useEffect, useState } from 'react';
import { userApi } from '@/api/client/user';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  findPendingRating,
  rememberRatingSkipped,
  type PendingRating,
} from '@/lib/pipeline-aftercare';
import type { Rating } from '@/types/pipeline';
import { QualityReport } from './QualityReport';
import { RateButtons } from './RateButtons';

/** Longest the student waits for the check; slower than this and the upload simply opens. */
export const RATE_CHECK_TIMEOUT_MS = 2500;

type Phase =
  | { name: 'checking' }
  | { name: 'rate'; pending: PendingRating }
  | { name: 'quality'; pending: PendingRating }
  | { name: 'open' };

/**
 * Rate first (SCOPE §2.1, P-20): if an earlier print was collected but never rated, one tap
 * rates it before the submission screen, then the upload opens straight away. Whether it can be
 * skipped is the backend's call (`ratingRequired`): never blocks on our own failure, so a slow
 * or broken check just opens the upload (P-92: not annoying). A thumbs-down offers the quick
 * optional quality step first.
 */
export function RateFirstGate({
  children,
  timeoutMs = RATE_CHECK_TIMEOUT_MS,
}: {
  /** The submission screen, shown once there is nothing left to rate. */
  children: React.ReactNode;
  timeoutMs?: number;
}) {
  const [phase, setPhase] = useState<Phase>({ name: 'checking' });

  useEffect(() => {
    const controller = new AbortController();
    const open = () =>
      setPhase((current) => (current.name === 'checking' ? { name: 'open' } : current));
    const timer = setTimeout(open, timeoutMs);

    userApi
      .getCurrentUserJobs({ pageSize: 25 }, { signal: controller.signal })
      .then((list) => {
        if (controller.signal.aborted) return;
        const pending = findPendingRating(list.data);
        setPhase((current) =>
          current.name !== 'checking'
            ? current
            : pending
              ? { name: 'rate', pending }
              : { name: 'open' },
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) open();
      })
      .finally(() => clearTimeout(timer));

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [timeoutMs]);

  if (phase.name === 'open') return <>{children}</>;

  if (phase.name === 'checking') {
    return (
      <Skeleton className="mx-auto h-40 w-full max-w-2xl rounded-xl" aria-label="Getting ready" />
    );
  }

  const { pending } = phase;
  const open = () => setPhase({ name: 'open' });

  function handleRated(rating: Rating) {
    setPhase(rating === 'down' ? { name: 'quality', pending } : { name: 'open' });
  }

  return (
    <section
      aria-labelledby="rate-first-heading"
      aria-live="polite"
      className="mx-auto w-full max-w-2xl space-y-4 rounded-xl border bg-card p-5"
      data-testid="rate-first"
      data-required={pending.required}
    >
      {phase.name === 'rate' ? (
        <>
          <div>
            <h2 id="rate-first-heading" className="text-lg font-semibold">
              Before you start: how did <span className="break-words">{pending.jobName}</span> turn
              out?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One tap, then you can upload your next part.
            </p>
          </div>
          <RateButtons jobId={pending.jobId} onRated={handleRated} />
          {pending.required ? (
            <p className="text-xs text-muted-foreground">
              We ask for a quick rating of your last print before the next one.
            </p>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                rememberRatingSkipped(pending.jobId);
                open();
              }}
            >
              Skip for now
            </Button>
          )}
        </>
      ) : (
        <>
          <h2 id="rate-first-heading" className="sr-only">
            Report print quality
          </h2>
          <QualityReport jobId={pending.jobId} onDone={open} />
        </>
      )}
    </section>
  );
}
