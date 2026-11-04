'use client';

import { useCallback, useEffect, useState } from 'react';
import { staffAlertsApi } from '@/api/client/staff-alerts';
import { SUMMARY_REFRESH_MS } from '@/lib/staff-alerts';
import type { AlertSummary } from '@/types/staff-alerts';

/** Fired by the alerts page after an alert is acknowledged or resolved, so the nav badge follows at once. */
export const ALERTS_CHANGED_EVENT = 'staff-alerts:changed';

/**
 * How many alerts still need a person, for the admin nav badge. Loads once, then every 30 seconds
 * (not while the tab is hidden), and straight away when the alerts page changes one. A failed
 * load keeps the last number: a badge that disappears on a hiccup would hide alerts.
 */
export function useAlertSummary(refreshMs: number = SUMMARY_REFRESH_MS): AlertSummary | null {
  const [summary, setSummary] = useState<AlertSummary | null>(null);

  const load = useCallback(async () => {
    try {
      setSummary(await staffAlertsApi.summary());
    } catch {
      // keep the last known number
    }
  }, []);

  useEffect(() => {
    const first = async () => {
      await load();
    };
    void first();
    const onChanged = () => void load();
    window.addEventListener(ALERTS_CHANGED_EVENT, onChanged);
    const timer =
      refreshMs > 0
        ? setInterval(() => {
            if (!document.hidden) void load();
          }, refreshMs)
        : undefined;
    return () => {
      window.removeEventListener(ALERTS_CHANGED_EVENT, onChanged);
      if (timer) clearInterval(timer);
    };
  }, [load, refreshMs]);

  return summary;
}
