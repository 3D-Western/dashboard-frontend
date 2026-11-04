'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { pipelineReviewApi } from '@/api/client/pipeline-review';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  QUEUE_STATUSES,
  filterQueue,
  shortCodes,
  shortId,
  staffStatusLabel,
  statusesOf,
  type QueueFilter,
} from '@/lib/pipeline-review';
import { Routes } from '@/lib/routes';
import { formatAgo } from '@/lib/signoff-format';
import { cn } from '@/lib/utils';
import type {
  PipelineHealth,
  PipelineSubmission,
  ProblemReport,
  QueueItem,
  QueueResponse,
} from '@/types/pipeline-review';
import { ProblemReportCard } from './ProblemReports';
import { StaffStatusBadge, reviewErrorMessage } from './ReviewBits';

export const QUEUE_REFRESH_MS = 15_000;

/** A report line of the queue as the full report the resolve form works on. */
const reportOf = (item: QueueItem): ProblemReport => ({
  id: item.reportId ?? null,
  jobId: item.jobId ?? null,
  studentId: item.studentId ?? 0,
  text: item.reportText ?? '',
  status: 'OPEN',
  createdAt: item.since,
});

function JobLine({ item, now }: { item: QueueItem; now: Date }) {
  const jobId = item.jobId;
  if (!jobId) return null;
  return (
    <Link
      href={Routes.adminReviewJob(jobId)}
      className="flex min-h-20 items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <StaffStatusBadge status={item.staffStatus} />
          <span className="truncate text-base font-medium">{item.jobName ?? 'Untitled job'}</span>
          {(item.openReports ?? 0) > 0 && (
            <Badge variant="secondary">
              {item.openReports} open {item.openReports === 1 ? 'report' : 'reports'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {item.studentName ?? 'Unnamed student'}
          {item.studentId != null ? ` (${item.studentId})` : ''} · job {shortId(jobId)} · here since{' '}
          {formatAgo(item.since, now)}
        </p>
        {(item.findingCodes?.length ?? 0) > 0 && (
          <p className="truncate font-mono text-xs text-muted-foreground">
            {shortCodes(item.findingCodes)}
          </p>
        )}
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

/**
 * Jobs that need a person plus open problem reports, oldest first, with a count per status and
 * filters. Refreshes itself every 15 seconds. Staff only.
 */
export function ReviewQueue({
  now,
  refreshMs = QUEUE_REFRESH_MS,
}: {
  now?: Date;
  refreshMs?: number;
}) {
  const [active, setActive] = useState<QueueFilter[]>([]);
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [failed, setFailed] = useState<PipelineSubmission[]>([]);
  const [health, setHealth] = useState<PipelineHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [requeuing, setRequeuing] = useState<string | null>(null);
  const [requeueError, setRequeueError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const query = useMemo(
    () =>
      active.length === 0
        ? {}
        : { status: statusesOf(active), reports: active.includes('reports') },
    [active],
  );

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [next, submissions, pipeline] = await Promise.all([
        pipelineReviewApi.queue(query),
        pipelineReviewApi.submissions('FAILED').catch(() => [] as PipelineSubmission[]),
        pipelineReviewApi.health().catch(() => null),
      ]);
      setQueue(next);
      setFailed(submissions);
      setHealth(pipeline);
      setError(null);
      setLoadedAt(new Date());
    } catch (err) {
      setError(reviewErrorMessage(err, "We couldn't load the review queue."));
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

  const clock = now ?? new Date();
  const items = useMemo(() => filterQueue(queue?.items ?? [], active), [queue, active]);

  function toggle(filter: QueueFilter) {
    setActive((current) =>
      current.includes(filter) ? current.filter((f) => f !== filter) : [...current, filter],
    );
  }

  async function requeue(jobId: string) {
    setRequeuing(jobId);
    setRequeueError(null);
    try {
      await pipelineReviewApi.requeue(jobId);
      await load();
    } catch (err) {
      setRequeueError(reviewErrorMessage(err, 'The submission could not be requeued.'));
    } finally {
      setRequeuing(null);
    }
  }

  const chips: { filter: QueueFilter; label: string; count: number }[] = [
    ...QUEUE_STATUSES.map((status) => ({
      filter: status as QueueFilter,
      label: staffStatusLabel(status),
      count: queue?.counts[status] ?? 0,
    })),
    { filter: 'reports', label: 'Problem reports', count: queue?.openReports ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {health && health.status !== 'ok' && (
        <Alert variant="destructive">
          <AlertTitle>The pipeline is {health.status}</AlertTitle>
          <AlertDescription>
            Decisions are queued and delivered when it is reachable again.
            {health.lastError ? ` Last error: ${health.lastError}` : ''}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(queue?.failedDecisions?.length ?? 0) > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Decisions that never reached the pipeline</AlertTitle>
          <AlertDescription>
            <ul className="space-y-1">
              {queue?.failedDecisions?.map((d) => (
                <li key={d.actionId}>
                  <Link
                    href={Routes.adminReviewJob(d.jobId)}
                    className="font-medium underline underline-offset-4"
                  >
                    Job {shortId(d.jobId)}
                  </Link>{' '}
                  {d.decision ? `(${d.decision.replaceAll('_', ' ')}) ` : ''}
                  {d.error ?? 'delivery failed'}. Decide again.
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter the queue">
          {chips.map(({ filter, label, count }) => {
            const on = active.includes(filter);
            return (
              <Button
                key={filter}
                type="button"
                variant={on ? 'default' : 'outline'}
                className={cn('h-11 fine:h-9')}
                aria-pressed={on}
                onClick={() => toggle(filter)}
              >
                {label}
                <Badge variant={on ? 'outline' : 'secondary'} className="ml-1">
                  {count}
                </Badge>
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

      {!queue && !error && (
        <div className="space-y-3" role="status" aria-label="Loading the review queue">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {queue && (
        <section aria-label="Queue" className="space-y-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {items.length === 0
              ? 'Nothing is waiting for a person.'
              : `${items.length} ${items.length === 1 ? 'item' : 'items'}, oldest first`}
          </p>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.kind === 'Report' ? `r-${item.reportId}` : `j-${item.jobId}`}>
                {item.kind === 'Report' ? (
                  <ProblemReportCard
                    report={reportOf(item)}
                    now={clock}
                    onResolved={() => void load()}
                  />
                ) : (
                  <JobLine item={item} now={clock} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {failed.length > 0 && (
        <section aria-label="Jobs the pipeline did not accept" className="space-y-3">
          <h2 className="text-lg font-semibold">Jobs the pipeline did not accept</h2>
          {requeueError && (
            <Alert variant="destructive">
              <AlertDescription>{requeueError}</AlertDescription>
            </Alert>
          )}
          <ul className="space-y-3">
            {failed.map((submission) => (
              <li
                key={submission.jobId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
              >
                <div className="min-w-0 space-y-1 text-sm">
                  <Link
                    href={Routes.adminReviewJob(submission.jobId)}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    Job {shortId(submission.jobId)}
                  </Link>
                  <p className="text-muted-foreground">
                    Failed after {submission.attempts}{' '}
                    {submission.attempts === 1 ? 'attempt' : 'attempts'}
                    {submission.lastError ? `: ${submission.lastError}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 fine:h-9"
                  disabled={requeuing === submission.jobId}
                  onClick={() => void requeue(submission.jobId)}
                >
                  {requeuing === submission.jobId ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw />
                  )}
                  Requeue
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
