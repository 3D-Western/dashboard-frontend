import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trainingAPI } from '@/api/client/training';
import { attemptIdFromError, trainingErrorMessage } from '@/api/client/training-errors';
import { ApiError } from '@/api/client/errors';
import { Routes } from '@/lib/routes';

/**
 * Starts (or resumes) an attempt and opens the player. If the server says an attempt is already
 * in progress, we open that one instead of showing an error.
 */
export function useStartTraining(onRefused?: () => void) {
  const router = useRouter();
  const [startingSlug, setStartingSlug] = useState<string | null>(null);
  const [error, setError] = useState<{ slug: string; message: string } | null>(null);

  const start = useCallback(
    async (slug: string) => {
      setStartingSlug(slug);
      setError(null);
      try {
        const attempt = await trainingAPI.startAttempt(slug);
        router.push(Routes.training.attempt(attempt.attemptId));
      } catch (err) {
        const existing = attemptIdFromError(err);
        if (err instanceof ApiError && err.code === 'ATTEMPT_ALREADY_IN_PROGRESS' && existing) {
          router.push(Routes.training.attempt(existing));
          return;
        }
        setError({ slug, message: trainingErrorMessage(err) });
        // The list may be out of date (a cooldown, a sign-off); refresh it so the card tells the truth.
        onRefused?.();
      } finally {
        setStartingSlug(null);
      }
    },
    [router, onRefused],
  );

  return { start, startingSlug, error };
}
