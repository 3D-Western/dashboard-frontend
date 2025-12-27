import PrintJobsTable from '@/components/PrintJobsTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { jobApi } from '@/api/client/job';
import { withSessionErrorHandling } from '@/lib/server-utils';

export default async function PrintPage() {
  // Fetch all user's print jobs with pagination
  // For now, we fetch with a large pageSize to get all jobs for client-side pagination
  // TODO: Implement proper server-side pagination with URL search params
  const { data: printJobs } = await withSessionErrorHandling(() =>
    jobApi.listAllJobs({ pageSize: 100 }),
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
        <PrintJobsTable printJobs={printJobs} />
      </div>
    </div>
  );
}
