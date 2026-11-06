'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, Radio } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePipelineJob } from '@/hooks/usePipelineJob';
import { trackPrintSubmitted } from '@/lib/analytics';
import { Routes } from '@/lib/routes';
import { studentStage } from '@/lib/student-status';
import { TONE_CLASSES } from '@/app/(protected)/dashboard/jobs/lib/job-stages';
import { cn } from '@/lib/utils';
import type { PipelineSnapshot, Plan, Rating, StudentStatus } from '@/types/pipeline';
import { AfterPickup } from './AfterPickup';
import { CannotPrint } from './CannotPrint';
import { PickupCard } from './PickupCard';
import { PartViewerSlot } from './PartViewerSlot';
import { PreparingSteps } from './PreparingSteps';
import { highlightsUrlOf, modelUrlOf, PlanFacts, previewUrlOf, ReviewPlan } from './ReviewPlan';

/** How long after a rating the job is read again to pick up the follow-up questions. */
const RATED_REREAD_MS = 4000;

const REVIEW_STATUSES: StudentStatus[] = ['needs_confirmation', 'needs_choice'];

interface PipelineJobPanelProps {
  jobId: string;
  jobName?: string;
  /** From the job row, so the right screen shows before the first pipeline response. */
  initialStatus?: StudentStatus;
  /** On the new-job screen the finished states link on to the job page. */
  showJobLink?: boolean;
  /** Told whenever the live status changes, so the rest of the page (the timeline) can follow it. */
  onStatusChange?: (status: StudentStatus) => void;
  /** Only show the live steps, whatever the status (the student is still typing their answers). */
  stepsOnly?: boolean;
  /**
   * Counts the student's own saves of their answers on the new-print screen. A new plan after one
   * of them is not a surprise ("your plan changed while you were reading it").
   */
  answersRevision?: number;
  /**
   * What the server already read for this job (the job page does), so the review is in the first
   * paint instead of after a client fetch.
   */
  initialSnapshot?: PipelineSnapshot | null;
  /**
   * The student has typed answers that are not saved yet. The review stays on screen (the yes does
   * not disappear while they type) but the yes waits, so it never confirms a plan that is about to change.
   */
  inputsPending?: boolean;
  /** Test hook: how quickly a broken stream is retried. */
  retryBaseMs?: number;
}

/**
 * Everything the pipeline has to say about one job, live: "Preparing your print" while it
 * works, the review with its explicit yes, "Can't print" with the way out, and the plain-words
 * status afterwards. Used on the new-job screen and the job page, so both show the same thing.
 */
export function PipelineJobPanel({
  jobId,
  jobName,
  initialStatus,
  showJobLink = false,
  stepsOnly = false,
  answersRevision = 0,
  inputsPending = false,
  initialSnapshot = null,
  onStatusChange,
  retryBaseMs,
}: PipelineJobPanelProps) {
  const pipeline = usePipelineJob(jobId, { retryBaseMs, initialSnapshot });
  const { plan, steps, message, loaded, connection, error } = pipeline;
  const status = pipeline.studentStatus ?? initialStatus ?? null;
  const { pickup } = pipeline;

  useEffect(() => {
    if (pipeline.studentStatus) onStatusChange?.(pipeline.studentStatus);
  }, [pipeline.studentStatus, onStatusChange]);

  // The plan the student first saw; a different one on screen later was changed under them.
  const [baselinePlanId, setBaselinePlanId] = useState<string | null>(null);
  const reviewing = status !== null && REVIEW_STATUSES.includes(status);
  useEffect(() => {
    if (!reviewing || !plan) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- remembers the plan first shown
    setBaselinePlanId((current) => current ?? plan.planId);
  }, [reviewing, plan]);
  const planWasUpdated = reviewing && baselinePlanId !== null && plan?.planId !== baselinePlanId;

  // The student's own change of their answers makes a new plan on purpose: that is not a surprise.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- forgets the plan shown before the student's own edit
    if (answersRevision > 0) setBaselinePlanId(null);
  }, [answersRevision]);

  // Rating a print that was still ready for pickup records the collection (P-136). The pipeline sends
  // the follow-up questions a moment after that and the live stream is closed by then, so the job is
  // re-read a few times instead of leaving the questions unseen.
  const refreshTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const timers = refreshTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);
  const { refresh, setOptimisticStatus, markRated, markRatingFailed } = pipeline;
  const wasReady = status === 'ready_for_pickup';
  // The tap shows its result at once; the re-reads wait until the server has the rating (reading
  // sooner would bring back the old status), and a failed save takes the result back.
  const readyBeforeRating = useRef(false);
  const handleRated = useCallback(
    (rating: Rating) => {
      markRated(rating);
      readyBeforeRating.current = wasReady;
      if (wasReady) setOptimisticStatus('collected');
    },
    [markRated, wasReady, setOptimisticStatus],
  );
  const handleRateSaved = useCallback(() => {
    refresh();
    refreshTimers.current.push(setTimeout(refresh, RATED_REREAD_MS));
  }, [refresh]);
  const handleRateFailed = useCallback(() => {
    markRatingFailed();
    if (readyBeforeRating.current) setOptimisticStatus('ready_for_pickup');
  }, [markRatingFailed, setOptimisticStatus]);

  const handlePlanChanged = (next: Plan | null) => {
    if (next) {
      pipeline.showPlan(next);
      // The conflicting plan is the new one: any plan shown after this is "updated" until yes.
    } else {
      pipeline.refresh();
    }
  };

  if (!loaded && !status) {
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Couldn&apos;t load your print</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Check your connection and try again.</p>
            <Button type="button" variant="outline" onClick={pipeline.refresh}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    return <Skeleton className="h-40 w-full rounded-lg" aria-label="Loading your print" />;
  }

  const stage = studentStage(status ?? 'preparing');
  const tone = TONE_CLASSES[stage.tone];

  const preparing = (
    <section aria-labelledby="preparing-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="preparing-heading" className="text-xl">
          Preparing your print
        </h2>
        <LiveBadge connection={connection} />
      </div>
      <p className="text-sm text-muted-foreground">
        We check your part the way a print-farm expert would. Here is what is happening, and why.
      </p>
      <PreparingSteps steps={steps} />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </section>
  );

  let body: React.ReactNode;
  if (stepsOnly) {
    body = preparing;
  } else if (status === 'cannot_print') {
    body = <CannotPrint plan={plan} message={message} jobName={jobName} />;
  } else if (reviewing && plan) {
    body = (
      <ReviewPlan
        // A different plan starts a fresh review: choices and edits belong to the old one.
        key={plan.planId}
        jobId={jobId}
        plan={plan}
        studentStatus={status as StudentStatus}
        planWasUpdated={planWasUpdated}
        inputsPending={inputsPending}
        onConfirmed={() => {
          pipeline.setOptimisticStatus('queued');
          setBaselinePlanId(null);
          trackPrintSubmitted(jobId);
        }}
        onPlanChanged={handlePlanChanged}
        onStudentChange={() => setBaselinePlanId(null)}
      />
    );
  } else if (reviewing) {
    // The job row already says a review is waiting but the plan has not arrived: hold its place
    // instead of showing the steps and then jumping.
    body = <ReviewSkeleton />;
  } else if (status === null || status === 'preparing') {
    body = preparing;
  } else {
    body = (
      <section aria-labelledby="stage-heading" className="space-y-4">
        <div className={cn('relative overflow-hidden rounded-lg border p-5 pl-6', tone.tint)}>
          <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', tone.bar)} />
          <p className={cn('eyebrow text-xs', tone.text)}>Current stage</p>
          <h2 id="stage-heading" className="mt-1 text-xl">
            {stage.label}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{message || stage.message}</p>
        </div>
        {/* Ready for pickup: where and what, nothing to do or confirm (P-136) */}
        {status === 'ready_for_pickup' && pickup && <PickupCard pickup={pickup} />}
        {/* Rating: the next time the student is here (it implies they have the print) */}
        {(status === 'collected' || status === 'ready_for_pickup') && (
          <AfterPickup
            jobId={jobId}
            jobName={jobName}
            ratingPending={pipeline.ratingPending}
            rating={pipeline.rating}
            followups={pipeline.followups}
            handledFollowups={pipeline.handledFollowups}
            onRated={handleRated}
            onRateSaved={handleRateSaved}
            onRateFailed={handleRateFailed}
            onFollowupHandled={pipeline.markFollowupHandled}
          />
        )}
        {plan && !(status === 'ready_for_pickup' && pickup) && (
          <PartViewerSlot
            previewUrl={previewUrlOf(plan)}
            modelUrl={modelUrlOf(plan)}
            highlightsUrl={highlightsUrlOf(plan)}
          />
        )}
        {plan && <PlanFacts plan={plan} />}
        {showJobLink && (
          <Button asChild variant="outline" size="lg" className="px-4">
            <Link href={Routes.jobs.detail(jobId)}>View this job</Link>
          </Button>
        )}
      </section>
    );
  }

  return (
    <div data-testid="pipeline-panel" data-status={status ?? 'loading'}>
      {body}
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading your review">
      <Skeleton className="h-7 w-3/4 rounded-md" />
      <Skeleton className="h-4 w-full rounded-md" />
      <Skeleton className="h-56 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <Skeleton className="h-11 w-full rounded-md md:w-48" />
    </div>
  );
}

function LiveBadge({ connection }: { connection: string }) {
  if (connection === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-status-green-foreground">
        <Radio className="size-3.5" aria-hidden="true" />
        Live
      </span>
    );
  }
  if (connection === 'reconnecting') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Reconnecting
      </span>
    );
  }
  return null;
}
