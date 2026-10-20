'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLocalTime } from '@/hooks/useLocalTime';
import { Routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { StatusHistory } from '@/types/jobs';
import { JOB_STAGES, TONE_CLASSES } from '../lib/job-stages';
import { JobListEntry } from './JobListItem';
import { JobRowMenu } from './JobRowMenu';
import { PrintProgress } from './PrintProgress';

const latestPrintingStart = (history?: StatusHistory[]) =>
  history
    ? [...history].reverse().find((entry) => entry.status === 'Printing')?.changedAt
    : undefined;

function ProgressCell({ job }: { job: JobListEntry }) {
  const eta = useLocalTime(job.jobETA?.estimatedCompletionTime ?? '', 'MMM d, h:mm a');

  if (job.status === 'Printing') {
    return (
      <PrintProgress
        startedAt={latestPrintingStart(job.statusHistory)}
        estimatedCompletion={job.jobETA?.estimatedCompletionTime}
        barClassName="h-4 sm:w-28"
      />
    );
  }
  if (job.status === 'InQueue' && job.jobETA) {
    return <span className="text-muted-foreground">Est. done {eta}</span>;
  }
  if (job.status === 'Ready' && job.pickupDetails?.location) {
    return <span className="text-muted-foreground">Pick up: {job.pickupDetails.location}</span>;
  }
  return <span className="text-muted-foreground">—</span>;
}

function JobTableRow({ job }: { job: JobListEntry }) {
  const router = useRouter();
  const href = Routes.jobs.detail(job.id);
  const stage = JOB_STAGES[job.status];
  const tone = TONE_CLASSES[stage?.tone ?? 'gray'];
  const createdAt = useLocalTime(job.jobPlaced, 'MMM d, yyyy');

  return (
    <TableRow
      className="cursor-pointer"
      // The whole row opens the job. The name link stays for keyboard users and new-tab clicks;
      // clicks on the link, the menu, or its dialogs (portalled outside the row) are left alone.
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!e.currentTarget.contains(target) || target.closest('a, button')) return;
        router.push(href);
      }}
    >
      <TableCell className="max-w-64 font-medium">
        <Link href={href} className="block truncate hover:text-purple-light hover:underline">
          {job.name}
        </Link>
      </TableCell>
      <TableCell>
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', tone.text)}>
          <span aria-hidden="true" className={cn('size-1.5 rounded-full', tone.bar)} />
          {stage?.label ?? job.status}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        <time dateTime={job.jobPlaced}>{createdAt}</time>
      </TableCell>
      <TableCell className="text-xs">
        <ProgressCell job={job} />
      </TableCell>
      <TableCell className="w-10 text-right">
        <JobRowMenu job={job} />
      </TableCell>
    </TableRow>
  );
}

/** Compact view of the same jobs: one line each, for people with many jobs. */
export function JobTable({ jobs }: { jobs: JobListEntry[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Job</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <JobTableRow key={job.id} job={job} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
