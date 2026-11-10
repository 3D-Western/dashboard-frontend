'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Routes } from '@/lib/routes';

/** No new step for this long: the student is told it is taking longer than usual (P-194). Real slicing often runs past 90 s, so a busy run never trips it. */
export const TAKING_LONGER_STALL_MS = 120_000;
/** Whatever the steps are doing, preparing for this long in total is told too. */
export const TAKING_LONGER_TOTAL_MS = 360_000;

export interface TakingLongerTimes {
  stallMs?: number;
  totalMs?: number;
}

/**
 * True once no new step event has arrived for `stallMs`, or `totalMs` have passed in all, whichever
 * comes first. `activity` is anything that changes with each step event (e.g. a count of them). The
 * count starts when the preparing screen appears: it is a courtesy to the student, not a measurement,
 * so a reload simply starts it again.
 */
export function useTakingLonger(
  active: boolean,
  activity: unknown = 0,
  { stallMs = TAKING_LONGER_STALL_MS, totalMs = TAKING_LONGER_TOTAL_MS }: TakingLongerTimes = {},
): boolean {
  const [late, setLate] = useState(false);
  // The total clock: runs from when preparing began, untouched by step events.
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setLate(true), totalMs);
    return () => {
      clearTimeout(timer);
      setLate(false); // preparing again later (after an edit) starts the count again
    };
  }, [active, totalMs]);
  // The stall clock: every new step event starts it over.
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setLate(true), stallMs);
    return () => clearTimeout(timer);
  }, [active, activity, stallMs]);
  return active && late;
}

/**
 * Shown under "Preparing your print" when preparing takes long, whatever the reason (P-194): says so
 * honestly, that nothing is wrong with leaving, and where the plan will be. It never says why: a job
 * under crew review looks exactly like a slow one to the student (P-43). The student is never held on
 * the page: they can go back to their jobs or start another upload.
 */
export function TakingLongerNotice() {
  return (
    <div
      role="status"
      data-testid="taking-longer"
      className="space-y-3 rounded-lg border border-control-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium">This is taking longer than usual</p>
          <p className="text-sm text-muted-foreground">
            You do not need to wait here. Your part keeps being prepared, and your plan will be
            waiting in My Jobs when it is ready. If you have notifications on, we will let you know
            as soon as it is.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={Routes.jobs.home}>Back to my jobs</Link>
        </Button>
        <Button asChild variant="outline">
          {/* a full page load on purpose: from the new-print screen itself it starts a clean form */}
          <a href={Routes.jobs.newPrintJob}>Start another upload</a>
        </Button>
      </div>
    </div>
  );
}
