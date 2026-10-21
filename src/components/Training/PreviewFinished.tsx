'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Attempt } from '@/types/training';

interface PreviewFinishedProps {
  attempt: Attempt;
  exitHref: string;
  onRestart: () => void;
}

/** The end of a staff preview. A real attempt would record a pass here; the preview records nothing. */
export function PreviewFinished({ attempt, exitHref, onRestart }: PreviewFinishedProps) {
  const score =
    attempt.scorePercent === null || attempt.scorePercent === undefined
      ? null
      : `${Math.round(Number(attempt.scorePercent))}%`;
  return (
    <section
      aria-labelledby="preview-finished-heading"
      className="space-y-5 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <CheckCircle2 className="size-8 shrink-0 text-status-green" aria-hidden="true" />
        <h2 id="preview-finished-heading" className="text-xl">
          That is the end of the training
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        A student who got this far would have passed.
        {score ? ` Last quiz score: ${score}.` : ''} Nothing was recorded: no attempt, no progress
        and no certification.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={onRestart} className="w-full sm:w-auto">
          Preview again
        </Button>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={exitHref}>Back to the editor</Link>
        </Button>
      </div>
    </section>
  );
}
