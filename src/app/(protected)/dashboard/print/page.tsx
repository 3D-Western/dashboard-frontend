import PrintJobsTable from '@/components/PrintJobsTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { withSessionErrorHandling } from '@/lib/server-utils';
import { userApi } from '@/api/client/user';
import { PrintPageFilters } from './components/PrintPageFilters';
import { PrintJobStatus } from '@/types/jobs';

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
    userApi.getCurrentUserOrders({ page, pageSize, status, search }),
  );

  return (
    <div className="container space-y-6 p-6">
      <div>
        <Link href="/dashboard/print/new">
          <Button size={'sm'} title="New Print">
            New Print
          </Button>
        </Link>
      </div>

      <PrintPageFilters />

      <div>
        <PrintJobsTable printJobs={printJobs} pagination={pagination} />
      </div>
    </div>
  );
}
