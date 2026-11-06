'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { pipelineReviewApi } from '@/api/client/pipeline-review';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { releasableFindings, shortId } from '@/lib/pipeline-review';
import { Routes } from '@/lib/routes';
import { formatAgo } from '@/lib/signoff-format';
import type { StaffJobView } from '@/types/pipeline-review';
import { DecisionPanel } from './DecisionPanel';
import { WatchItPrint } from '@/components/Pipeline/WatchItPrint';
import { JobDetails } from './JobDetails';
import { WaiveRating } from './WaiveRating';
import { StaffStatusBadge, reviewErrorMessage } from './ReviewBits';

export const JOB_REFRESH_MS = 15_000;

/** The pipeline did not accept the upload: staff fix it and put it back in the queue. */
function FailedSubmission({ job, onRequeued }: { job: StaffJobView; onRequeued: () => void }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submission = job.submission;
  if (!submission || submission.status !== 'FAILED') return null;

  async function requeue() {
    setSending(true);
    setError(null);
    try {
      await pipelineReviewApi.requeue(job.jobId);
      onRequeued();
    } catch (err) {
      setError(reviewErrorMessage(err, 'The submission could not be requeued.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>The pipeline did not accept this job</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          Submission FAILED after {submission.attempts}{' '}
          {submission.attempts === 1 ? 'attempt' : 'attempts'}
          {submission.lastError ? `: ${submission.lastError}` : '.'}
        </p>
        {error && <p role="alert">{error}</p>}
        <Button
          type="button"
          variant="outline"
          className="h-11 text-foreground fine:h-9"
          disabled={sending}
          onClick={() => void requeue()}
        >
          {sending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw />}
          Requeue submission
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/** One job, in full, refreshed every 15 seconds while the tab is open. */
export function ReviewJobView({
  jobId,
  refreshMs = JOB_REFRESH_MS,
}: {
  jobId: string;
  refreshMs?: number;
}) {
  const [job, setJob] = useState<StaffJobView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setJob(await pipelineReviewApi.job(jobId));
      setError(null);
    } catch (err) {
      setError(reviewErrorMessage(err, "We couldn't load this job."));
    }
  }, [jobId]);

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

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="-ml-3 h-11 fine:h-9">
        <Link href={Routes.adminReview}>
          <ArrowLeft aria-hidden="true" />
          Review queue
        </Link>
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {error}
            <Button type="button" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!job && !error && (
        <div className="space-y-3" role="status" aria-label="Loading job">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {job && (
        <>
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold break-words">{job.name ?? 'Untitled job'}</h1>
              <StaffStatusBadge status={job.staffStatus} />
            </div>
            <p className="text-sm text-muted-foreground">
              {job.owner.name ?? 'Unnamed student'}
              {job.owner.studentId != null ? ` (student ${job.owner.studentId})` : ''}
              {' · '}job <span className="font-mono">{shortId(job.jobId)}</span>
              {job.studentStatus
                ? ` · student sees “${job.studentStatus.replaceAll('_', ' ')}”`
                : ''}
              {' · '}updated {formatAgo(job.updatedAt)}
            </p>
          </header>

          <FailedSubmission job={job} onRequeued={() => void load()} />

          {/* On a printer with a live view on (P-100): staff may watch any print. No controls over the printer. */}
          {job.liveView && <WatchItPrint key={job.jobId} jobId={job.jobId} audience="staff" />}

          <DecisionPanel
            key={job.jobId}
            jobId={job.jobId}
            allowedDecisions={job.allowedDecisions}
            releasable={releasableFindings(job.findings)}
            onDecided={() => void load()}
          />

          {job.studentStatus === 'collected' && <WaiveRating key={job.jobId} jobId={job.jobId} />}

          <JobDetails job={job} onReportResolved={() => void load()} />
        </>
      )}
    </div>
  );
}
