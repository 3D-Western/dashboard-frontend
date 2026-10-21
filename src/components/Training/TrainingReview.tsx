'use client';

import { useMemo } from 'react';
import { reviewRuntimeApi } from '@/lib/training-review';
import { Routes } from '@/lib/routes';
import { TrainingPlayer } from './TrainingPlayer';
import { TrainingRuntimeProvider } from './TrainingRuntime';

/**
 * /dashboard/training/attempt/[id]/review: the real player in review mode. The student looks back
 * over a failed attempt's video, reading and attestation text. Read-only: no quiz, no questions,
 * and nothing is recorded (see `reviewRuntimeApi`).
 */
export function TrainingReview({
  attemptId,
  initialStepId,
}: {
  attemptId: number;
  initialStepId?: number | null;
}) {
  const review = useMemo(() => ({ exitHref: Routes.training.attempt(attemptId) }), [attemptId]);
  return (
    <TrainingRuntimeProvider api={reviewRuntimeApi} review={review}>
      <TrainingPlayer attemptId={attemptId} initialStepId={initialStepId} />
    </TrainingRuntimeProvider>
  );
}
