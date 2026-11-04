'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, Radio } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePipelineJob } from '@/hooks/usePipelineJob';
import { Routes } from '@/lib/routes';
import { studentStage } from '@/lib/student-status';
import { TONE_CLASSES } from '@/app/(protected)/dashboard/jobs/lib/job-stages';
import { cn } from '@/lib/utils';
import type { Plan, StudentStatus } from '@/types/pipeline';
import { AfterPickup } from './AfterPickup';
import { CannotPrint } from './CannotPrint';
import { CollectButton } from './CollectButton';
import { PickupCard } from './PickupCard';
import { PartViewerSlot } from './PartViewerSlot';
import { PreparingSteps } from './PreparingSteps';
import { highlightsUrlOf, modelUrlOf, PlanFacts, previewUrlOf, ReviewPlan } from './ReviewPlan';

/** How long after "collected" the job is read again to pick up the follow-up questions. */
const COLLECTED_REREAD_MS = 4000;

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
  onStatusChange,
  retryBaseMs,
}: PipelineJobPanelProps) {
  const pipeline = usePipelineJob(jobId, { retryBaseMs });
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

  // The pipeline sends the follow-up questions a moment after "collected" and the live stream is
  // closed by then, so the job is re-read a few times instead of leaving the questions unseen.
  const refreshTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const timers = refreshTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);
  const { refresh, setOptimisticStatus } = pipeline;
  const handleCollected = useCallback(() => {
    setOptimisticStatus('collected');
    refresh();
    refreshTimers.current.push(setTimeout(refresh, COLLECTED_REREAD_MS));
  }, [setOptimisticStatus, refresh]);

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
        onConfirmed={() => {
          pipeline.setOptimisticStatus('queued');
          setBaselinePlanId(null);
        }}
        onPlanChanged={handlePlanChanged}
        onStudentChange={() => setBaselinePlanId(null)}
      />
    );
  } else if (status === null || status === 'preparing' || reviewing) {
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
        {status === 'ready_for_pickup' && pickup && (
          <PickupCard
            pickup={pickup}
            jobId={jobId}
            onCollected={handleCollected}
            onCollectConflict={refresh}
          />
        )}
        {status === 'ready_for_pickup' && !pickup && (
          <CollectButton jobId={jobId} onCollected={handleCollected} onConflict={refresh} />
        )}
        {status === 'collected' && (
          <AfterPickup
            jobId={jobId}
            jobName={jobName}
            ratingPending={pipeline.ratingPending}
            rating={pipeline.rating}
            followups={pipeline.followups}
            handledFollowups={pipeline.handledFollowups}
            onRated={pipeline.markRated}
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
