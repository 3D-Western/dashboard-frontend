// hooks/useLocalTime.ts
'use client';

import { useSyncExternalStore } from 'react';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Format a given UTC/ISO date string into the user's local time zone.
 * - Safe for SSR (falls back to UTC until mounted)
 * - Uses date-fns-tz for predictable formatting
 */
export function useLocalTime(dateString: string, format = 'yyyy-MM-dd HH:mm') {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Server-side or before hydration: use UTC
  if (!isMounted) {
    try {
      return formatInTimeZone(dateString, 'UTC', format);
    } catch {
      return dateString;
    }
  }

  // Client-side: use local timezone
  try {
    const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return formatInTimeZone(dateString, userTZ, format);
  } catch {
    return dateString;
  }
}
