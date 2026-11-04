'use client';

import { useState } from 'react';
import { PipelineJobPanel } from '@/components/Pipeline/PipelineJobPanel';
import { ReportProblem } from '@/components/Pipeline/ReportProblem';
import { cn } from '@/lib/utils';
import { JobDetail } from '@/types/jobs';
import type { StudentStatus } from '@/types/pipeline';
import { FeatureProjectCta } from './FeatureProjectCta';
import { JobDetailHeader } from './JobDetailHeader';
import { JobInfo } from './JobInfo';
import { PipelineTimeline } from './PipelineTimeline';

/**
 * The job page for a job that went through the print pipeline. The header, the live panel and
 * the timeline all follow the same `studentStatus`, which updates as the pipeline streams, so
 * none of them can disagree (and none reads the legacy status).
 */
export function PipelineJobView({
  job,
  initialStatus,
}: {
  job: JobDetail;
  initialStatus: StudentStatus;
}) {
  const [status, setStatus] = useState<StudentStatus>(initialStatus);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 max-md:pr-11">
      <JobDetailHeader job={{ ...job, studentStatus: status }} />

      <PipelineJobPanel
        jobId={job.id}
        jobName={job.name}
        initialStatus={initialStatus}
        onStatusChange={setStatus}
      />

      {status === 'collected' && <FeatureProjectCta jobName={job.name} jobId={job.id} />}

      {/* Phones: timeline first, then details. Desktop: details left, timeline right. */}
      <div className="grid gap-6 xl:grid-cols-3">
        <section
          aria-labelledby="status-history-heading"
          className="rounded-lg border bg-card xl:col-start-3 xl:row-start-1"
        >
          <h2 id="status-history-heading" className="border-b px-5 py-3 text-base">
            Status history
          </h2>
          <div className="p-5">
            <PipelineTimeline
              studentStatus={status}
              createdAt={job.dateSubmitted || job.jobPlaced}
            />
          </div>
        </section>
        <JobInfo job={job} className={cn('xl:col-span-2 xl:row-start-1')} />
      </div>

      <ReportProblem jobId={job.id} />
    </div>
  );
}
