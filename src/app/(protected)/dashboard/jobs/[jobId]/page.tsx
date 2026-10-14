import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { jobApi } from '@/api/client/job';
import { Routes } from '@/lib/routes';
import { JobDetail } from '@/types/jobs';
import { FeatureProjectCta } from './components/FeatureProjectCta';
import { JobDetailHeader } from './components/JobDetailHeader';
import { JobInfo } from './components/JobInfo';
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

export default async function JobDetailPage({ params }: PageProps) {
  const { jobId } = await params;

  let job: JobDetail | null = null;
  try {
    const response = await jobApi.getJobById(jobId);
    const res = response as { data?: JobDetail };
    job = res.data ? res.data : response;
  } catch (error) {
    console.error('Failed to fetch job:', error);
  }

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
            className="inline-flex items-center gap-1.5 text-sm text-purple-light hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to My Jobs
          </Link>
        </div>
      </div>
    );
  }

  const hasHistory = Boolean(job.statusHistory?.length);
  const isFinished = job.status === 'Ready' || job.status === 'Succeeded';

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <JobDetailHeader job={job} />

      <StagePanel job={job} />

      {isFinished && <FeatureProjectCta jobName={job.name} jobId={job.id} />}

      {/* Phones: timeline first, then details. Desktop: details left, timeline right. */}
      <div className="grid gap-6 lg:grid-cols-3">
        {hasHistory && (
          <section
            aria-labelledby="status-history-heading"
            className="rounded-lg border bg-card lg:col-start-3 lg:row-start-1"
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
          className={hasHistory ? 'lg:col-span-2 lg:row-start-1' : 'lg:col-span-3'}
        />
      </div>
    </div>
  );
}
