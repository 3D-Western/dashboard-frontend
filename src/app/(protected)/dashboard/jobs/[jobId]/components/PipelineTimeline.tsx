'use client';

import { Check, X } from 'lucide-react';
import { useLocalTime } from '@/hooks/useLocalTime';
import { cn } from '@/lib/utils';
import type { StudentStatus } from '@/types/pipeline';
import { TONE_CLASSES } from '../../lib/job-stages';
import { studentStage } from '@/lib/student-status';

// The path a pipeline job takes, in the student's words. Each step is the student-facing status
// (or statuses) it stands for; the timeline follows `studentStatus` and never the legacy status.
const PATH: { label: string; statuses: StudentStatus[] }[] = [
  { label: 'Job created', statuses: [] },
  { label: 'Preparing', statuses: ['preparing'] },
  { label: 'Your review', statuses: ['needs_confirmation', 'needs_choice'] },
  { label: 'Queued', statuses: ['queued'] },
  { label: 'Printing', statuses: ['printing', 'reprinting'] },
  { label: 'Ready for pickup', statuses: ['ready_for_pickup'] },
  { label: 'Collected', statuses: ['collected'] },
];

// How far along the path each status is. Statuses that end the story elsewhere are handled below.
const POSITION: Partial<Record<StudentStatus, number>> = {
  preparing: 1,
  needs_confirmation: 2,
  needs_choice: 2,
  queued: 3,
  printing: 4,
  reprinting: 4,
  ready_for_pickup: 5,
  collected: 6,
};

// Ends the story early, after the last step the student can be sure it reached.
const STOPPED_AFTER: Partial<Record<StudentStatus, number>> = {
  cannot_print: 1, // it was analysed, then could not go on
  rejected: 1,
  expired: 2, // waited for the student's yes that never came
  cancelled: 0,
  not_collected: 5, // it was ready; the window passed
};

function StepDate({ date }: { date: string }) {
  const time = useLocalTime(date, 'MMM d, h:mm a');
  return <time dateTime={date}>{time}</time>;
}

/**
 * Timeline of a pipeline job. The backend gives only the current `studentStatus`, not when each
 * step happened, so the one date shown is the real one it has: when the job was created. A date
 * is never guessed (and never taken from the legacy status history, which belongs to another
 * status model and can pre-date the job).
 */
export function PipelineTimeline({
  studentStatus,
  createdAt,
}: {
  studentStatus: StudentStatus;
  createdAt?: string;
}) {
  const stoppedAfter = STOPPED_AFTER[studentStatus];
  const stopped = stoppedAfter !== undefined;
  const position = stopped ? stoppedAfter : (POSITION[studentStatus] ?? 1);
  const steps = PATH.slice(0, stopped ? position + 1 : PATH.length);
  const stage = studentStage(studentStatus);

  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const finished = studentStatus === 'collected';
        const isCurrent = !stopped && index === position && !finished;
        const isDone = stopped || finished || index < position;
        const isLast = index === steps.length - 1 && !stopped;

        return (
          <li key={step.label} className="relative flex gap-3 pb-6 last:pb-0">
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
                {step.label}
                {isCurrent && <span className="sr-only"> (current step)</span>}
              </p>
              {index === 0 && createdAt && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <StepDate date={createdAt} />
                </p>
              )}
              {isCurrent && stage.message && (
                <p className="mt-0.5 text-xs text-muted-foreground">{stage.message}</p>
              )}
            </div>
          </li>
        );
      })}

      {stopped && (
        <li className="relative flex gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-white',
              TONE_CLASSES[stage.tone].bar,
            )}
          >
            <X className="size-3.5" strokeWidth={3} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className={cn('text-sm font-semibold', TONE_CLASSES[stage.tone].text)}>
              {stage.label}
              <span className="sr-only"> (current step)</span>
            </p>
          </div>
        </li>
      )}
    </ol>
  );
}
