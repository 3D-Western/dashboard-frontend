// hooks/useLocalTime.ts
'use client';

import { useEffect, useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Format a given UTC/ISO date string into the user's local time zone.
 * - Safe for SSR (falls back to UTC until mounted)
 * - Uses date-fns-tz for predictable formatting
 */
export function useLocalTime(dateString: string, format = 'yyyy-MM-dd HH:mm') {
  const [localTime, setLocalTime] = useState(() => {
    try {
      // Fallback to UTC on server
      return formatInTimeZone(dateString, 'UTC', format);
    } catch {
      return dateString;
    }
  });

  useEffect(() => {
    try {
      const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const formatted = formatInTimeZone(dateString, userTZ, format);
      setLocalTime(formatted);
    } catch {
      // Do nothing on invalid date
    }
  }, [dateString, format]);

  return localTime;
}
