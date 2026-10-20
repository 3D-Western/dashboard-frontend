import { useCallback, useEffect, useRef, useState } from 'react';

export interface AdminResource<T> {
  data: T | null;
  error: unknown;
  isLoading: boolean;
  /** Fetches again without blanking the screen. */
  reload: () => Promise<void>;
  /** Replaces the data with something the server just returned. */
  setData: (data: T) => void;
}

/**
 * Loads one thing for an admin screen. Pass a `loader` that is stable (wrap it in `useCallback`
 * keyed on its ids); it runs on mount and again whenever the loader changes. A response from an
 * older loader never overwrites a newer one.
 */
export function useAdminResource<T>(loader: () => Promise<T>): AdminResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++latest.current;
    try {
      const result = await loader();
      if (mine !== latest.current) return;
      setData(result);
      setError(null);
    } catch (err: unknown) {
      if (mine !== latest.current) return;
      setError(err);
    } finally {
      if (mine === latest.current) setIsLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    const run = async () => {
      await reload();
    };
    void run();
    return () => {
      latest.current += 1;
    };
  }, [reload]);

  return { data, error, isLoading, reload, setData };
}
