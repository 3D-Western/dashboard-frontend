import PrintJobsTable from '@/components/PrintJobsTable';
import { Button } from '@/components/ui/button';
import { jobApi } from '@/api/client/job';
import { withSessionErrorHandling } from '@/lib/server-utils';

export default async function PrintPage() {
  const { jobs: printJobs } = await withSessionErrorHandling(() =>
    jobApi.listAllJobs()
  );

  return (
    
    <div className="container p-6 space-y-6">
      <div>
        <Button size={'sm'} aria-disabled="true" title="New Print">
          New Print
          <span className="sr-only">New Print</span>
        </Button>


      </div>

      <div>
        <PrintJobsTable printJobs={printJobs} />
      </div>
    </div>
  );
}
