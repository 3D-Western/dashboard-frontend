import type { Metadata } from 'next';
import PrintJobsTable from '@/components/PrintJobsTable';
import { withSessionErrorHandling } from '@/lib/server-utils';
import { userApi } from '@/api/client/user';
import { JobPageFilters } from './components/JobPageFilters';
import { PrintJobStatus } from '@/types/jobs';

export const metadata: Metadata = {
  title: 'My Jobs',
  description: 'View and manage your jobs',
};

interface PrintPageProps {
  searchParams: Promise<{ page?: string; pageSize?: string; status?: string; search?: string }>;
}

export default async function PrintPage({ searchParams }: PrintPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;
  const status = params.status as PrintJobStatus | undefined;
  const search = params.search;

  // Fetch user's print jobs with server-side pagination and filters
  const { data: printJobs, pagination } = await withSessionErrorHandling(() =>
    userApi.getCurrentUserJobs({ page, pageSize, status, search }),
  );

  return (
    <div className="container space-y-6 p-6">
      <JobPageFilters />

      <div>
        <PrintJobsTable printJobs={printJobs} pagination={pagination} />
      </div>
    </div>
  );
}
