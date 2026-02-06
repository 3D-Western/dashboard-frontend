import type { Metadata } from 'next';
import PrintJobsTable from '@/components/PrintJobsTable';
import { jobApi } from '@/api/client/job';
import { withSessionErrorHandling } from '@/lib/server-utils';
import { AdminJobFilters } from './components/AdminJobFilters';
import { PrintJobStatus } from '@/types/jobs';
import PageTitle from '@/components/PageTitle';

export const metadata: Metadata = {
  title: 'Job Management',
  description: 'Manage all jobs across users',
};

interface JobManagementPageProps {
  searchParams: Promise<{ page?: string; pageSize?: string; status?: string; search?: string }>;
}

export default async function JobManagementPage({ searchParams }: JobManagementPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;
  const status = params.status as PrintJobStatus | undefined;
  const search = params.search;

  // Fetch all jobs with server-side pagination and filters
  const { data: printJobs, pagination } = await withSessionErrorHandling(() =>
    jobApi.listAllJobs({ page, pageSize, status, search }),
  );

  return (
    <div className="container space-y-6 p-6">
      <PageTitle title="Job Management" description="Manage all jobs across users" />

      <AdminJobFilters />

      <div>
        <PrintJobsTable printJobs={printJobs} pagination={pagination} mode="admin" />
      </div>
    </div>
  );
}
