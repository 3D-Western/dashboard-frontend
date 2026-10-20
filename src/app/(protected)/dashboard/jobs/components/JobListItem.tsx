'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLocalTime } from '@/hooks/useLocalTime';
import { Routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { JobDetail, PrintJob, StatusHistory } from '@/types/jobs';
import { JOB_STAGES, JobStage, TONE_CLASSES } from '../lib/job-stages';
import { JobRowMenu } from './JobRowMenu';
import { PrintProgress } from './PrintProgress';

// The list endpoint returns PrintJob; these detail fields are used when the API includes them
export type JobListEntry = PrintJob &
  Partial<Pick<JobDetail, 'jobETA' | 'statusHistory' | 'pickupDetails'>>;

const latestEntry = (history: StatusHistory[] | undefined, status: PrintJob['status']) =>
  history ? [...history].reverse().find((entry) => entry.status === status) : undefined;

function getStage(job: JobListEntry): JobStage {
  const stage: JobStage = JOB_STAGES[job.status] ?? {
    // A status the frontend doesn't know yet (the backend added one) still renders sensibly
    label: job.status,
    tone: 'gray',
    message: '',
    actionLabel: 'View details',
  };

  if (job.status === 'Ready' && job.pickupDetails?.location) {
    return { ...stage, message: `Ready to pick up at ${job.pickupDetails.location}.` };
  }
  if (job.status === 'Flagged') {
    const reason = latestEntry(job.statusHistory, 'Flagged')?.comments;
    if (reason) return { ...stage, message: `Declined: ${reason}` };
  }
  return stage;
}

export function JobListItem({ job }: { job: JobListEntry }) {
  const stage = getStage(job);
  const tone = TONE_CLASSES[stage.tone];
  const href = Routes.jobs.detail(job.id);
  const createdAt = useLocalTime(job.jobPlaced, 'MMM d, yyyy');

  return (
    <li className="relative flex overflow-hidden rounded-lg border bg-card transition-colors hover:border-purple-light/50 has-[[data-job-link]:focus-visible]:ring-2 has-[[data-job-link]:focus-visible]:ring-ring">
      <span aria-hidden="true" className={cn('w-1 shrink-0', tone.bar)} />

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6">
        {/* Right padding on phones leaves room for the menu pinned in the top-right corner */}
        <div className="min-w-0 flex-1 pr-8 sm:pr-0">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[11px] leading-none">
            <span className={cn('inline-flex items-center gap-1.5 eyebrow', tone.text)}>
              <span aria-hidden="true" className={cn('size-1.5 rounded-full', tone.bar)} />
              {stage.label}
            </span>
            {/* Dot and date stay together so a wrap never leaves the dot dangling */}
            <span className="inline-flex items-center gap-2.5 text-muted-foreground">
              <span aria-hidden="true">·</span>
              <time dateTime={job.jobPlaced} className="eyebrow">
                {createdAt}
              </time>
            </span>
          </p>
          <h3 className="mt-2 truncate text-base">
            {/* Stretched link: the whole card opens the job; the buttons sit above it */}
            <Link
              href={href}
              data-job-link
              className="outline-none after:absolute after:inset-0 after:content-['']"
            >
              {job.name}
            </Link>
          </h3>
          {stage.message && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{stage.message}</p>
          )}
        </div>

        <div className="relative z-10 flex items-center gap-2 sm:justify-end">
          {job.status === 'Printing' ? (
            <PrintProgress
              className="flex-1 sm:flex-none"
              startedAt={latestEntry(job.statusHistory, 'Printing')?.changedAt}
              estimatedCompletion={job.jobETA?.estimatedCompletionTime}
            />
          ) : (
            <Button asChild variant="outline" size="lg" className="px-4">
              <Link href={href} aria-label={`${stage.actionLabel}: ${job.name}`}>
                {stage.actionLabel}
              </Link>
            </Button>
          )}
        </div>

        {/* Phones: pinned to the card's top-right corner; wider screens: after the button */}
        <div className="absolute top-2 right-2 z-10 sm:relative sm:top-auto sm:right-auto sm:-ml-4">
          <JobRowMenu job={job} />
        </div>
      </div>
    </li>
  );
}
