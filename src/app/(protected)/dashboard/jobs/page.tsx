import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Plus } from 'lucide-react';
import { InstallPrompt } from '@/components/InstallPrompt/InstallPrompt';
import { Button } from '@/components/ui/button';
import { FilterToolbar } from '@/components/Filters';
import { userApi } from '@/api/client/user';
import { withSessionErrorHandling } from '@/lib/server-utils';
import { Routes } from '@/lib/routes';
import { PrintJobStatus } from '@/types/jobs';
import { JobList } from './components/JobList';
import { JobsViewToggle } from './components/JobsViewToggle';
import { JOB_STAGES, JOB_STATUS_FILTER_OPTIONS } from './lib/job-stages';
import { JOBS_VIEW_COOKIE, parseJobsView } from './lib/jobs-view';

export const metadata: Metadata = {
  title: 'My Jobs',
  description: 'Create 3D print jobs and follow each one from submission to pickup',
};

interface MyJobsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    status?: string;
    search?: string;
    submitted?: string;
  }>;
}

const isPrintJobStatus = (value: string | undefined): value is PrintJobStatus =>
  value !== undefined && value in JOB_STAGES;

export default async function MyJobsPage({ searchParams }: MyJobsPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;
  const status = isPrintJobStatus(params.status) ? params.status : undefined;
  const search = params.search?.trim() || undefined;
  const view = parseJobsView((await cookies()).get(JOBS_VIEW_COOKIE)?.value);

  const { data: jobs, pagination } = await withSessionErrorHandling(() =>
    userApi.getCurrentUserJobs({ page, pageSize, status, search }),
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between fine:items-start">
        <div>
          <h1 className="text-3xl font-bold">My Jobs</h1>
          <p className="mt-2 text-muted-foreground">
            Create 3D print jobs and follow each one from submission to pickup.
          </p>
        </div>
        <Button asChild size="pill" className="self-start tracking-wide uppercase">
          <Link href={Routes.jobs.newPrintJob}>
            <Plus aria-hidden="true" />
            Create job
          </Link>
        </Button>
      </div>

      {/* Just submitted a print: the moment to offer the home-screen app (phones only) */}
      <InstallPrompt moment={params.submitted === '1' ? 'print-submitted' : null} />

      <FilterToolbar
        searchPlaceholder="Search for a job..."
        searchLabel="Search your jobs"
        statusOptions={JOB_STATUS_FILTER_OPTIONS}
        trailing={<JobsViewToggle view={view} />}
      />

      <JobList
        jobs={jobs}
        pagination={pagination}
        hasFilters={Boolean(status || search)}
        view={view}
      />
    </div>
  );
}
