'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePipelineJob } from '@/hooks/usePipelineJob';
import { trackPrintSubmitted } from '@/lib/analytics';
import { Routes } from '@/lib/routes';
import { studentStage } from '@/lib/student-status';
import { TONE_CLASSES } from '@/app/(protected)/dashboard/jobs/lib/job-stages';
import { cn } from '@/lib/utils';
import type { PipelineSnapshot, Plan, Purpose, Rating, StudentStatus } from '@/types/pipeline';
import { AfterPickup } from './AfterPickup';
import { CannotPrint } from './CannotPrint';
import { DisagreePanel } from './DisagreePanel';
import { PickupCard } from './PickupCard';
import { PartViewerSlot } from './PartViewerSlot';
import { useTakingLonger, type TakingLongerTimes } from './TakingLongerNotice';
import { WatchItPrint } from './WatchItPrint';
import { PlanFacts } from './PlanFacts';
import { SentView, StudentStage } from './StudentFlow/StudentStage';
import { highlightsUrlOf, modelUrlOf, previewUrlOf } from '@/lib/plan-artifacts';

/** How long after a rating the job is read again to pick up the follow-up questions. */
const RATED_REREAD_MS = 4000;

/**
 * How long after an accepted yes, choice or answer the job is read once more. The pipeline can
 * refuse it later without a stream frame; the reason then only shows in the snapshot's message.
 */
const ACTION_REREAD_MS = 2500;

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
  /** Test hook: how long after an accepted action the job is read again. */
  actionRereadMs?: number;
  /** Test hook: how quickly a broken stream is retried. */
  retryBaseMs?: number;
  /** Test hook: when the student is told preparing is taking longer than usual (stall / total). */
  takingLongerAfter?: TakingLongerTimes;
  /** The student's own file, when still in memory (new-print screen): drawn greyed while preparing. */
  file?: File | null;
  /** What the student said the print is for (new-print screen): the loading view's tips fit it. */
  purpose?: Purpose | null;
  /**
   * The new-print screen's intake is still on screen (Continue not pressed): the job is followed in
   * the background and nothing of it shows yet.
   */
  held?: boolean;
  /**
   * Told which full-height view the panel shows: the loading view, the story, the "sent" screen, or
   * null for the ordinary status cards. Those views fill the page and never scroll (P-200).
   */
  onStageChange?: (stage: 'loading' | 'story' | 'sent' | null) => void;
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
  actionRereadMs = ACTION_REREAD_MS,
  retryBaseMs,
  takingLongerAfter,
  file = null,
  purpose = null,
  held = false,
  onStageChange,
}: PipelineJobPanelProps) {
  const pipeline = usePipelineJob(jobId, { retryBaseMs, initialSnapshot });
  const { plan, steps, message, loaded, error } = pipeline;
  const status = pipeline.studentStatus ?? initialStatus ?? null;
  const { pickup } = pipeline;
  // Preparing that goes on (a big part, or one the crew is looking at: the student cannot tell which) is said out loud (P-194).
  const takingLonger = useTakingLonger(
    status === null || status === 'preparing',
    `${steps.length}:${steps.filter((step) => step.state !== 'started').length}`,
    takingLongerAfter,
  );

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
  // The backend accepted an action (202) but the pipeline may refuse it afterwards, and that only
  // shows as a message in the snapshot: read it once, a moment later (one pending read at a time).
  const { reread } = pipeline;
  const rereadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rereadSoon = useCallback(() => {
    if (rereadTimer.current) clearTimeout(rereadTimer.current);
    rereadTimer.current = setTimeout(() => {
      rereadTimer.current = null;
      reread();
    }, actionRereadMs);
  }, [reread, actionRereadMs]);
  useEffect(
    () => () => {
      if (rereadTimer.current) clearTimeout(rereadTimer.current);
    },
    [],
  );
  // The student's answers were saved on the new-print screen.
  useEffect(() => {
    if (answersRevision > 0) rereadSoon();
  }, [answersRevision, rereadSoon]);
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

  // The student said yes on this screen: "Sent to print queue" until they move on.
  const [sentOnce, setSent] = useState(false);
  // If the pipeline refused the yes afterwards the job is back in review: the story shows again.
  const sent = sentOnce && !reviewing;
  const preparingNow = status === null || status === 'preparing';
  const inStage = !held && !sent && status !== 'cannot_print' && (preparingNow || reviewing);
  const stageName: 'loading' | 'story' | 'sent' | null = held
    ? null
    : sent
      ? 'sent'
      : inStage
        ? reviewing && plan && !stepsOnly
          ? 'story'
          : 'loading'
        : null;
  useEffect(() => {
    onStageChange?.(stageName);
  }, [stageName, onStageChange]);

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

  let body: React.ReactNode;
  if (held) {
    body = null;
  } else if (sent) {
    body = <SentView jobId={jobId} showJobLink={showJobLink} onClose={() => setSent(false)} />;
  } else if (status === 'cannot_print') {
    body = <CannotPrint plan={plan} message={message} jobName={jobName} />;
  } else if (inStage) {
    body = (
      <StudentStage
        steps={steps}
        plan={plan}
        status={status}
        file={file}
        purpose={purpose}
        ready={reviewing && plan !== null && !stepsOnly}
        skipLoading={
          !file && initialStatus !== undefined && REVIEW_STATUSES.includes(initialStatus)
        }
        takingLonger={takingLonger}
        story={{
          jobId,
          planWasUpdated,
          inputsPending,
          notice: message,
          onConfirmed: () => {
            pipeline.setOptimisticStatus('queued');
            setBaselinePlanId(null);
            trackPrintSubmitted(jobId);
            setSent(true);
            rereadSoon();
          },
          onPlanChanged: handlePlanChanged,
          onStudentChange: () => {
            setBaselinePlanId(null);
            rereadSoon();
          },
        }}
      />
    );
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
        {/* On a printer, and the backend says a live view is on: the student may watch it print (P-100) */}
        {(status === 'printing' || status === 'reprinting') && pipeline.liveView && (
          <WatchItPrint jobId={jobId} />
        )}
        {/* Ready for pickup: where and what, nothing to do or confirm (P-136) */}
        {status === 'ready_for_pickup' && pickup && (
          <PickupCard pickup={pickup} modelUrl={modelUrlOf(plan)} />
        )}
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

  // "Ask why" goes with the status cards and a finished decision; in the story it is "Ask about
  // this" on each card, and while the part is being prepared there is nothing to ask about yet.
  const canAskWhy = !held && !inStage && !sent && status !== null && status !== 'preparing';

  return (
    <div
      data-testid="pipeline-panel"
      data-status={status ?? 'loading'}
      data-stage={stageName ?? undefined}
      className={stageName ? 'sf-panel' : undefined}
    >
      {body}
      {canAskWhy && (
        <div className="mt-6">
          <DisagreePanel jobId={jobId} currentPlanId={plan?.planId} />
        </div>
      )}
    </div>
  );
}
