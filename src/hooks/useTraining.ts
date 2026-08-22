import { useState, useEffect, useCallback } from 'react';
import { trainingAPI } from '@/api/client/training';
import { TrainingLevel } from '@/types/training';

export function useTrainingLevel() {
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrainingLevel = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await trainingAPI.getTrainingLevel();
      const typedResponse = response as { trainingLevel?: TrainingLevel } | TrainingLevel;
      const level =
        typeof typedResponse === 'string' ? typedResponse : (typedResponse?.trainingLevel ?? null);
      setTrainingLevel(level);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch training level';
      setError(errorMessage);
      console.error('Error fetching training level:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const runFetch = async () => {
      await fetchTrainingLevel();
    };
    runFetch();
  }, [fetchTrainingLevel]);

  return { trainingLevel, isLoading, error, refetch: fetchTrainingLevel };
}
