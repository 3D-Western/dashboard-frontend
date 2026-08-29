import { useState, useEffect, useCallback } from 'react';
import { onboardingAPI } from '@/api/client/onboarding';
import { OnboardingAnswers } from '@/types/onboarding';

export function useOnboardingStatus() {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await onboardingAPI.getStatus();
      setOnboardingCompleted(response.onboardingCompleted ?? false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch onboarding status';
      setError(errorMessage);
      console.error('Error fetching onboarding status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const runFetch = async () => {
      await fetchStatus();
    };
    runFetch();
  }, [fetchStatus]);

  const submitOnboarding = useCallback(async (answers: OnboardingAnswers) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await onboardingAPI.submit(answers);
      setOnboardingCompleted(response.onboardingCompleted ?? true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit onboarding';
      setError(errorMessage);
      console.error('Error submitting onboarding:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    onboardingCompleted,
    isLoading,
    isSubmitting,
    error,
    refetch: fetchStatus,
    submitOnboarding,
  };
}
