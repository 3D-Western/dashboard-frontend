'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Routes } from '@/lib/routes';

/** How long a part may be "preparing" before the student is told it is taking longer than usual (P-194). */
export const TAKING_LONGER_AFTER_MS = 90_000;

/**
 * True once `afterMs` have passed since this was first shown. The count starts when the preparing
 * screen appears: it is a courtesy to the student, not a measurement, so a reload simply starts it again.
 */
export function useTakingLonger(
  active: boolean,
  afterMs: number = TAKING_LONGER_AFTER_MS,
): boolean {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setLate(true), afterMs);
    return () => {
      clearTimeout(timer);
      setLate(false); // preparing again later (after an edit) starts the count again
    };
  }, [active, afterMs]);
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
