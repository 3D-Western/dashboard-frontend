'use client';

import { useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { accessAdminAPI } from '@/api/client/access-admin';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LoadState } from '@/components/TrainingAdmin/feedback';
import { useAdminResource } from '@/hooks/useAdminResource';
import { useNow } from '@/hooks/useNow';
import { formatAgo, formatDuration, formatWhen, personName } from '@/lib/access-admin-format';

/** How often the screen asks for fresh numbers while it is open. */
export const LIVE_REFRESH_MS = 15_000;

/** /admin/access: who is checked in now and which machines are running, refreshed while the page is open. */
export function LiveView() {
  const load = useCallback(() => accessAdminAPI.getLive(), []);
  const live = useAdminResource(load);
  const loadGatekeepers = useCallback(() => accessAdminAPI.listGatekeepers(), []);
  const gatekeepers = useAdminResource(loadGatekeepers);
  const now = useNow(10_000);
  const { reload } = live;

  useEffect(() => {
    const timer = setInterval(() => void reload(), LIVE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [reload]);

  const lastHeard = (gatekeepers.data ?? [])
    .map((g) => g.lastSeenAt)
    .filter((value): value is string => !!value)
    .sort()
    .at(-1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {live.data ? `Updated ${formatWhen(live.data.generatedAt)}. ` : ''}
          This page refreshes by itself.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
          <RefreshCw /> Refresh
        </Button>
      </div>

      <LoadState
        isLoading={live.isLoading}
        error={live.error}
        hasData={!!live.data}
        onRetry={() => void reload()}
        what="who is in"
      >
        {live.data && (
          <div className="space-y-6">
            <section aria-labelledby="live-people" className="space-y-2">
              <h2 id="live-people" className="text-lg font-semibold">
                In the space now ({live.data.visits.length}
                {live.data.visitsTruncated ? '+' : ''})
              </h2>
              {live.data.visits.length === 0 ? (
                <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
                  Nobody is checked in.
                </p>
              ) : (
                <ul className="divide-y rounded-xl border bg-card">
                  {live.data.visits.map((visit) => (
                    <li
                      key={visit.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 p-3"
                    >
                      <span className="font-medium">
                        {personName(visit.firstName, visit.lastName, visit.studentNumber)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        in for {formatDuration(visit.startedAt, now)} · since{' '}
                        {formatWhen(visit.startedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="live-machines" className="space-y-2">
              <h2 id="live-machines" className="text-lg font-semibold">
                Machines running ({live.data.sessions.length}
                {live.data.sessionsTruncated ? '+' : ''})
              </h2>
              {live.data.sessions.length === 0 ? (
                <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
                  No machine is running.
                </p>
              ) : (
                <ul className="divide-y rounded-xl border bg-card">
                  {live.data.sessions.map((session) => (
                    <li
                      key={session.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 p-3"
                    >
                      <span>
                        <span className="font-medium">
                          {session.machineName ?? `Machine ${session.machineId}`}
                        </span>{' '}
                        <span className="text-sm text-muted-foreground">
                          used by{' '}
                          {personName(session.firstName, session.lastName, session.studentNumber)}
                        </span>
                      </span>
                      <span className="text-sm text-muted-foreground">
                        running for {formatDuration(session.startedAt, now)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Alert role="note">
              <AlertTitle>Energy used so far is not shown yet</AlertTitle>
              <AlertDescription>
                The gatekeeper reports a session’s energy (Wh) only when the session ends, so it
                appears on the finished session, not here. Showing it live needs the gatekeeper to
                send running power readings.
              </AlertDescription>
            </Alert>
            <p className="text-xs text-muted-foreground">
              These lists are what the gatekeeper has reported to the dashboard
              {lastHeard ? ` (last heard from it ${formatAgo(lastHeard, now)})` : ''}. If the PC has
              been offline, they can be behind.
            </p>
          </div>
        )}
      </LoadState>
    </div>
  );
}
