'use client';

import { Check, Loader2, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StepProgress } from '@/types/pipeline';

function StepIcon({ state }: { state: StepProgress['state'] }) {
  const base = 'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full';
  if (state === 'done') {
    return (
      <span aria-hidden="true" className={cn(base, 'bg-status-green/15 text-status-green')}>
        <Check className="size-3.5" />
      </span>
    );
  }
  if (state === 'skipped') {
    return (
      <span aria-hidden="true" className={cn(base, 'bg-muted text-muted-foreground')}>
        <Minus className="size-3.5" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={cn(base, 'bg-primary/15 text-primary')}>
      <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
    </span>
  );
}

const STATE_LABEL: Record<StepProgress['state'], string> = {
  started: 'in progress',
  done: 'done',
  skipped: 'skipped',
};

/**
 * "Preparing your print": the pipeline's steps as they stream in, each with its one-line teaching
 * moment (P-61). `waitingFor` is shown as the working step before the first one arrives.
 */
export function PreparingSteps({
  steps,
  waitingFor = 'Getting started',
  className,
}: {
  steps: StepProgress[];
  waitingFor?: string;
  className?: string;
}) {
  const list: StepProgress[] =
    steps.length > 0 ? steps : [{ step: 'pending', title: waitingFor, state: 'started' }];

  return (
    <ol className={cn('space-y-4', className)} aria-label="Preparing your print">
      {list.map((step) => (
        <li key={step.step} className="flex gap-3" data-state={step.state}>
          <StepIcon state={step.state} />
          <div className="min-w-0">
            <p
              className={cn(
                'text-sm font-medium',
                step.state === 'skipped' && 'text-muted-foreground',
              )}
            >
              {step.title}
              <span className="sr-only"> ({STATE_LABEL[step.state]})</span>
            </p>
            {step.teaching && (
              <p className="mt-0.5 text-sm text-muted-foreground">{step.teaching}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
