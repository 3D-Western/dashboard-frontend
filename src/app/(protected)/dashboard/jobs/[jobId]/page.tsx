import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { jobApi } from '@/api/client/job';
import { pipelineApi } from '@/api/client/pipeline';
import { ReportProblem } from '@/components/Pipeline/ReportProblem';
import { Routes } from '@/lib/routes';
import { JobDetail } from '@/types/jobs';
import type { PipelineSnapshot } from '@/types/pipeline';
import { FeatureProjectCta } from './components/FeatureProjectCta';
import { JobDetailHeader } from './components/JobDetailHeader';
import { JobInfo } from './components/JobInfo';
import { PipelineJobView } from './components/PipelineJobView';
import { StagePanel } from './components/StagePanel';
import { StatusStepper } from './components/StatusStepper';

export const metadata: Metadata = {
  title: 'Job Details',
  description: 'Where your 3D print job is and what to do next',
};

interface PageProps {
  params: Promise<{
    jobId: string;
  }>;
}

/** How long the page waits for the pipeline's state before showing what it has. */
const SNAPSHOT_TIMEOUT_MS = 4000;

/**
 * The pipeline's state for the job, read with the job itself (in parallel, so it adds no wait):
 * it says whether this is a pipeline job at all, even before the first event has given the job row
 * a `studentStatus`, and lets the review show in the first paint. null when there is none.
 */
async function readSnapshot(jobId: string): Promise<PipelineSnapshot | null> {
  try {
    return await pipelineApi.getState(jobId, { signal: AbortSignal.timeout(SNAPSHOT_TIMEOUT_MS) });
  } catch {
    return null;
  }
}

export default async function JobDetailPage({ params }: PageProps) {
  const { jobId } = await params;

  let job: JobDetail | null = null;
  const [jobResult, snapshotResult] = await Promise.allSettled([
    jobApi.getJobById(jobId),
    readSnapshot(jobId),
  ]);
  if (jobResult.status === 'fulfilled') {
    const res = jobResult.value as { data?: JobDetail };
    job = res.data ? res.data : jobResult.value;
  } else {
    console.error('Failed to fetch job:', jobResult.reason);
  }
  const snapshot = snapshotResult.status === 'fulfilled' ? snapshotResult.value : null;

  if (!job) {
    return (
      <div className="mx-auto w-full max-w-5xl p-6">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-primary-text/25 px-6 py-12 text-center">
          <h1 className="text-xl">Job not found</h1>
          <p className="text-sm text-muted-foreground">
            This job doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <Link
            href={Routes.jobs.home}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to My Jobs
          </Link>
        </div>
      </div>
    );
  }

  // A job that went through the print pipeline has its own live page, worded and dated by
  // studentStatus only. A new job has no studentStatus on its row until the first event, but the
  // pipeline already knows it, so the snapshot counts too: it never shows the old static page.
  const pipelineStatus =
    job.studentStatus ?? (job.category === 'ThreeDPrint' ? snapshot?.studentStatus : undefined);
  if (pipelineStatus) {
    return (
      <PipelineJobView
        job={job}
        initialStatus={pipelineStatus}
        initialSnapshot={job.category === 'ThreeDPrint' ? snapshot : null}
      />
    );
  }

  const hasHistory = Boolean(job.statusHistory?.length);
  // Ask to feature the project once they've actually picked it up, not while it's waiting
  const isCollected = job.status === 'Succeeded';

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 max-md:pr-11">
      <JobDetailHeader job={job} />

      <StagePanel job={job} />

      {isCollected && <FeatureProjectCta jobName={job.name} jobId={job.id} />}

      {/* Phones: timeline first, then details. Desktop: details left, timeline right. */}
      <div className="grid gap-6 xl:grid-cols-3">
        {hasHistory && (
          <section
            aria-labelledby="status-history-heading"
            className="rounded-lg border bg-card xl:col-start-3 xl:row-start-1"
          >
            <h2 id="status-history-heading" className="border-b px-5 py-3 text-base">
              Status history
            </h2>
            <div className="p-5">
              <StatusStepper
                currentStatus={job.status}
                history={job.statusHistory}
                createdAt={job.dateSubmitted || job.jobPlaced}
              />
            </div>
          </section>
        )}
        <JobInfo
          job={job}
          className={hasHistory ? 'xl:col-span-2 xl:row-start-1' : 'xl:col-span-3'}
        />
      </div>

      {/* Not a pipeline job: the pipeline has no such job to report on, so it is the email version. */}
      <ReportProblem />
    </div>
  );
}
