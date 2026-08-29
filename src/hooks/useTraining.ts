import { useState, useEffect, useCallback } from 'react';
import { trainingAPI } from '@/api/client/training';
import { TrainingLevel } from '@/types/training';

export function useTrainingLevel() {
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isToggling, setIsToggling] = useState<boolean>(false);
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

  // Temporary self-service toggle so QA can flip Level 1 <-> Level 2 without reseeding the
  // mock DB, to validate the booking gate. Not a real feature - see Sprint 4 Slack thread.
  const toggleLevel = useCallback(async () => {
    setIsToggling(true);
    setError(null);
    try {
      const next: TrainingLevel = trainingLevel === 'LEVEL_2' ? 'LEVEL_1' : 'LEVEL_2';
      await trainingAPI.updateTrainingLevel(next);
      await fetchTrainingLevel();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update training level';
      setError(errorMessage);
      console.error('Error updating training level:', err);
    } finally {
      setIsToggling(false);
    }
  }, [trainingLevel, fetchTrainingLevel]);

  return { trainingLevel, isLoading, isToggling, error, refetch: fetchTrainingLevel, toggleLevel };
}
