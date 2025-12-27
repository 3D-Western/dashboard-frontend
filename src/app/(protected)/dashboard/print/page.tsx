import PrintJobsTable from '@/components/PrintJobsTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { jobApi } from '@/api/client/job';
import { withSessionErrorHandling } from '@/lib/server-utils';

interface PrintPageProps {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}

export default async function PrintPage({ searchParams }: PrintPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;

  // Fetch user's print jobs with server-side pagination
  const { data: printJobs, pagination } = await withSessionErrorHandling(() =>
    jobApi.listAllJobs({ page, pageSize }),
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

      <div>
        <PrintJobsTable printJobs={printJobs} pagination={pagination} />
      </div>
    </div>
  );
}
