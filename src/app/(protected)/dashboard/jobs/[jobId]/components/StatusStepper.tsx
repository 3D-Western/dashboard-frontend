'use client';

import { Check, X } from 'lucide-react';
import { useLocalTime } from '@/hooks/useLocalTime';
import { cn } from '@/lib/utils';
import { PrintJobStatus, StatusHistory } from '@/types/jobs';
import { JOB_STAGES, TONE_CLASSES } from '../../lib/job-stages';

interface StatusStepperProps {
  currentStatus: PrintJobStatus;
  history?: StatusHistory[];
  /** When the job was created; dates the first step if the history doesn't include it */
  createdAt?: string;
}

// The normal path every job takes
const CORE_PROGRESSION: PrintJobStatus[] = [
  'PendingFile',
  'InQueue',
  'Printing',
  'Ready',
  'Succeeded',
];

// Statuses that stop the normal path; the timeline ends at the step where it happened
const EXCEPTION_STATUSES: PrintJobStatus[] = ['Flagged', 'Error', 'Failed', 'Cancelled'];

const stepLabel = (status: PrintJobStatus) =>
  // The first step is when the job was created; "Draft" describes a job still sitting there
  status === 'PendingFile' ? 'Job created' : (JOB_STAGES[status]?.label ?? status);

const latestEntry = (history: StatusHistory[], status: PrintJobStatus) =>
  [...history].reverse().find((entry) => entry.status === status);

function StepTime({ date }: { date: string }) {
  const time = useLocalTime(date, 'MMM d, h:mm a');
  return <time dateTime={date}>{time}</time>;
}

function StepNote({ entry, tone }: { entry?: StatusHistory; tone?: string }) {
  if (!entry) return null;
  return (
    <>
      <p className="mt-0.5 text-xs text-muted-foreground">
        <StepTime date={entry.changedAt} />
        {entry.changedBy && (
          <>
            {' '}
            · by {entry.changedBy.firstName} {entry.changedBy.lastName}
          </>
        )}
      </p>
      {entry.comments && (
        <p
          className={cn(
            'mt-2 rounded-md border-l-2 border-primary-text/20 bg-muted/60 px-3 py-2 text-xs',
            tone,
          )}
        >
          {entry.comments}
        </p>
      )}
    </>
  );
}

/** Delivery-style timeline of a job's status changes. */
export function StatusStepper({ currentStatus, history = [], createdAt }: StatusStepperProps) {
  const isException = EXCEPTION_STATUSES.includes(currentStatus);
  const coreIndex = CORE_PROGRESSION.indexOf(currentStatus);

  // For an exception, the last normal step the job actually reached (it can stop at any point)
  const lastReachedIndex = Math.max(
    0,
    ...CORE_PROGRESSION.map((step, index) => (latestEntry(history, step) ? index : 0)),
  );

  const steps = isException ? CORE_PROGRESSION.slice(0, lastReachedIndex + 1) : CORE_PROGRESSION;
  const exceptionStage = JOB_STAGES[currentStatus];

  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const entry =
          latestEntry(history, step) ??
          (step === 'PendingFile' && createdAt
            ? { status: step, changedAt: createdAt }
            : undefined);
        // "Completed" is the end of the line, so it shows as done rather than in progress
        const isFinished = currentStatus === 'Succeeded';
        const isCurrent = step === currentStatus && !isFinished;
        const isDone = !isCurrent && (isException || isFinished || coreIndex > index);
        const isLast = index === steps.length - 1 && !isException;

        return (
          <li key={step} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-6 bottom-0 left-[11px] w-0.5',
                  isDone ? 'bg-purple-light' : 'bg-border',
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                isDone && 'border-purple-light bg-purple-light text-white',
                isCurrent && 'border-purple-light bg-background',
                !isDone && !isCurrent && 'border-border bg-background',
              )}
            >
              {isDone && <Check className="size-3.5" strokeWidth={3} />}
              {isCurrent && <span className="size-2 animate-pulse rounded-full bg-purple-light" />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  'text-sm font-semibold',
                  !isDone && !isCurrent && 'text-muted-foreground',
                )}
              >
                {stepLabel(step)}
                {isCurrent && <span className="sr-only"> (current step)</span>}
              </p>
              <StepNote entry={entry} />
            </div>
          </li>
        );
      })}

      {isException && exceptionStage && (
        <li className="relative flex gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-white',
              TONE_CLASSES[exceptionStage.tone].bar,
            )}
          >
            <X className="size-3.5" strokeWidth={3} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className={cn('text-sm font-semibold', TONE_CLASSES[exceptionStage.tone].text)}>
              {exceptionStage.label}
              <span className="sr-only"> (current step)</span>
            </p>
            <StepNote entry={latestEntry(history, currentStatus)} />
          </div>
        </li>
      )}
    </ol>
  );
}
