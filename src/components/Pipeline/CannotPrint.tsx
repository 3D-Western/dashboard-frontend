'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isJobCreationEnabled } from '@/lib/feature-flags';
import { Routes } from '@/lib/routes';
import type { Plan } from '@/types/pipeline';
import { EmailUsButton } from '@/app/(protected)/dashboard/jobs/[jobId]/components/EmailUsButton';
import { AnalysisDetails, ConsequentialCards, splitLessonCards } from './LessonCards';
import { PartFocusProvider } from './PartFocus';
import { PartViewerSlot } from './PartViewerSlot';
import { highlightsUrlOf, modelUrlOf, previewUrlOf } from '@/lib/plan-artifacts';

/**
 * "Can't print": why, and what to change. The pipeline's summary says why; its consequential
 * cards say what to change in the part (or the file) before trying again.
 */
export function CannotPrint({
  plan,
  message,
  jobName,
}: {
  plan: Plan | null;
  message?: string | null;
  jobName?: string;
}) {
  const { consequential, rest } = splitLessonCards(plan?.lessonCards);
  const why =
    plan?.summary || message || "We couldn't make this part print safely on our printers.";

  return (
    <PartFocusProvider>
      <div className="space-y-5">
        <div>
          <h2 className="flex items-start gap-2 text-xl text-status-red-foreground">
            <XCircle className="mt-1 size-5 shrink-0" aria-hidden="true" />
            This part can&apos;t be printed as it is.
          </h2>
          <h3 className="mt-4 text-sm font-semibold">Why</h3>
          <p className="mt-1 text-sm text-muted-foreground">{why}</p>
        </div>

        {plan && (
          <PartViewerSlot
            previewUrl={previewUrlOf(plan)}
            modelUrl={modelUrlOf(plan)}
            highlightsUrl={highlightsUrlOf(plan)}
            highlights={plan.lessonCards}
          />
        )}

        {consequential.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">What to change</h3>
            <ConsequentialCards cards={consequential} />
          </div>
        )}

        <AnalysisDetails cards={rest} />

        <div className="flex flex-wrap gap-2">
          {isJobCreationEnabled() && (
            <Button asChild size="lg" className="px-4">
              <Link href={Routes.jobs.newPrintJob}>Upload a fixed file</Link>
            </Button>
          )}
          <EmailUsButton
            label="Ask about this decision"
            subject={`Question about my job${jobName ? `: ${jobName}` : ''}`}
            className="px-4"
          />
        </div>
      </div>
    </PartFocusProvider>
  );
}
