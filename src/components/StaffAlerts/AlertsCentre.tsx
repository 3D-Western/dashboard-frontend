'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { staffAlertsApi } from '@/api/client/staff-alerts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { reviewErrorMessage } from '@/components/PipelineReview/ReviewBits';
import { ALERTS_CHANGED_EVENT } from '@/hooks/useAlertSummary';
import { formatAgo } from '@/lib/signoff-format';
import {
  ALERT_MAX_LIMIT,
  ALERT_PAGE_SIZE,
  ALERT_REFRESH_MS,
  DEFAULT_FILTER,
  KIND_LABEL,
  KIND_ORDER,
  STATE_LABEL,
  STATE_ORDER,
  queryOf,
  toggled,
  type AlertFilter,
} from '@/lib/staff-alerts';
import type { AlertListResponse, StaffAlert } from '@/types/staff-alerts';
import { AlertCard } from './AlertCard';

/**
 * The alerts centre (P-135): holds, escalations and pipeline outages, newest first, with filters
 * by kind and state. Each alert links to where it is dealt with and can be acknowledged or
 * resolved in place. Refreshes itself every 15 seconds like the review queue. Staff only.
 */
export function AlertsCentre({
  now,
  refreshMs = ALERT_REFRESH_MS,
}: {
  now?: Date;
  refreshMs?: number;
}) {
  const [filter, setFilter] = useState<AlertFilter>(DEFAULT_FILTER);
  const [limit, setLimit] = useState(ALERT_PAGE_SIZE);
  const [data, setData] = useState<AlertListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const query = useMemo(() => queryOf(filter, limit), [filter, limit]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await staffAlertsApi.list(query));
      setError(null);
      setLoadedAt(new Date());
    } catch (err) {
      setError(reviewErrorMessage(err, "We couldn't load the alerts."));
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  useEffect(() => {
    const first = async () => {
      await load();
    };
    void first();
    if (refreshMs <= 0) return;
    const timer = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) void load();
    }, refreshMs);
    return () => clearInterval(timer);
  }, [load, refreshMs]);

  /** Swap the changed alert in place; it leaves a filtered list at the next refresh, not under the user's finger. */
  function changed(updated: StaffAlert) {
    setData((current) => {
      if (!current) return current;
      const before = current.items.find((a) => a.id === updated.id);
      const wasUnread = before?.state === 'open';
      const isUnread = updated.state === 'open';
      return {
        ...current,
        items: current.items.map((a) => (a.id === updated.id ? updated : a)),
        unacknowledged: Math.max(0, current.unacknowledged - (wasUnread && !isUnread ? 1 : 0)),
      };
    });
    window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));
  }

  const clock = now ?? new Date();
  const items = data?.items ?? [];
  const more = data !== null && data.total > items.length && limit < ALERT_MAX_LIMIT;

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by state">
          {STATE_ORDER.map((state) => {
            const on = filter.states.includes(state);
            return (
              <Button
                key={state}
                type="button"
                variant={on ? 'default' : 'outline'}
                className="h-11 fine:h-9"
                aria-pressed={on}
                onClick={() => setFilter((f) => ({ ...f, states: toggled(f.states, state) }))}
              >
                {STATE_LABEL[state]}
                {state === 'open' && data && (
                  <Badge variant={on ? 'outline' : 'secondary'} className="ml-1">
                    {data.unacknowledged}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by kind">
            {KIND_ORDER.map((kind) => {
              const on = filter.kinds.includes(kind);
              return (
                <Button
                  key={kind}
                  type="button"
                  variant={on ? 'default' : 'outline'}
                  className="h-11 fine:h-9"
                  aria-pressed={on}
                  onClick={() => setFilter((f) => ({ ...f, kinds: toggled(f.kinds, kind) }))}
                >
                  {KIND_LABEL[kind]}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            {loadedAt && (
              <span className="text-xs text-muted-foreground">
                Updated {formatAgo(loadedAt.toISOString(), clock)}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-11 fine:h-9"
              onClick={() => void load()}
              disabled={refreshing}
            >
              <RefreshCw className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {!data && !error && (
        <div className="space-y-3" role="status" aria-label="Loading the alerts">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {data && (
        <section aria-label="Alerts" className="space-y-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {items.length === 0
              ? filter.states.length === 1 &&
                filter.states[0] === 'open' &&
                filter.kinds.length === 0
                ? 'No alerts need a person.'
                : 'No alerts match these filters.'
              : `${data.total} ${data.total === 1 ? 'alert' : 'alerts'}, newest first`}
          </p>
          <ul className="space-y-3">
            {items.map((alert) => (
              <li key={alert.id}>
                <AlertCard alert={alert} now={clock} onChanged={changed} />
              </li>
            ))}
          </ul>
          {more && (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full sm:w-auto fine:h-9"
              onClick={() => setLimit((l) => l + ALERT_PAGE_SIZE)}
            >
              Show more
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
