import { useState, useEffect, useCallback } from 'react';
import { usageAPI } from '@/api/client/usage';
import { UsageEntry, ProjectTypeLimit, RemainingQuota, UsagePeriod } from '@/types/usage';
import { calculateRemainingQuota } from '@/utils/usage-calculators';

export function useUsageSummary(userId: string, period?: UsagePeriod) {
  const [entries, setEntries] = useState<UsageEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await usageAPI.getUsageSummary(userId, period);
      setEntries(response.entries ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage summary');
    } finally {
      setIsLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    const runFetch = async () => {
      await fetchUsage();
    };
    runFetch();
  }, [fetchUsage]);

  return { entries, isLoading, error, refetch: fetchUsage };
}

export function useAccountLimits(userId: string) {
  const [limits, setLimits] = useState<ProjectTypeLimit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await usageAPI.getAccountLimits(userId);
      setLimits(response.limits ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch account limits');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const runFetch = async () => {
      await fetchLimits();
    };
    runFetch();
  }, [fetchLimits]);

  return { limits, isLoading, error, refetch: fetchLimits };
}

// Convenience: usage + limits combined into remaining quota per project type.
export function useRemainingQuota(
  userId: string,
  period?: UsagePeriod,
): {
  quota: RemainingQuota[];
  isLoading: boolean;
} {
  const { entries, isLoading: usageLoading } = useUsageSummary(userId, period);
  const { limits, isLoading: limitsLoading } = useAccountLimits(userId);

  return {
    quota: calculateRemainingQuota(entries, limits),
    isLoading: usageLoading || limitsLoading,
  };
}
