import PrintJobsTable from '@/components/PrintJobsTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { jobApi } from '@/api/client/job';
import { withSessionErrorHandling } from '@/lib/server-utils';

export default async function PrintPage() {
  const { jobs: printJobs } = await withSessionErrorHandling(() => jobApi.listAllJobs());

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
