import { useCallback, useEffect, useState } from 'react';
import { trainingAPI } from '@/api/client/training';
import type { MyTrainings } from '@/types/training';

export interface MyTrainingsState {
  data: MyTrainings | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** My trainings and certifications (GET /training/trainings). */
export function useMyTrainings(): MyTrainingsState {
  const [data, setData] = useState<MyTrainings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrainings = useCallback(async () => {
    setError(null);
    try {
      setData(await trainingAPI.getMyTrainings());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch your training');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const runFetch = async () => {
      await fetchTrainings();
    };
    runFetch();
  }, [fetchTrainings]);

  return { data, isLoading, error, refetch: fetchTrainings };
}
