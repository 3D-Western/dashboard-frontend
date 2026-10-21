import { useEffect, useState } from 'react';

/**
 * The current time in milliseconds, refreshed every [intervalMs] so "5 min ago" and "online" stay true on a
 * screen that is left open.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
