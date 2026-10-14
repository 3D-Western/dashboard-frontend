'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useLocalTime } from '@/hooks/useLocalTime';
import { Routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { JobDetail } from '@/types/jobs';
import { JOB_STAGES, TONE_CLASSES } from '../../lib/job-stages';
import { JobRowMenu } from '../../components/JobRowMenu';

export function JobDetailHeader({ job }: { job: JobDetail }) {
  const router = useRouter();
  const stage = JOB_STAGES[job.status];
  const tone = TONE_CLASSES[stage?.tone ?? 'gray'];
  const createdAt = useLocalTime(job.dateSubmitted || job.jobPlaced, 'MMM d, yyyy');

  return (
    <div>
      <Link
        href={Routes.jobs.home}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        My Jobs
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 text-[11px] leading-none">
            <span className={cn('inline-flex items-center gap-1.5 eyebrow', tone.text)}>
              <span aria-hidden="true" className={cn('size-1.5 rounded-full', tone.bar)} />
              {stage?.label ?? job.status}
            </span>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <span className="eyebrow text-muted-foreground">Created {createdAt}</span>
          </p>
          <h1 className="mt-2 text-3xl font-bold break-words">{job.name}</h1>
        </div>
        <JobRowMenu job={job} onDeleted={() => router.push(Routes.jobs.home)} />
      </div>
    </div>
  );
}
