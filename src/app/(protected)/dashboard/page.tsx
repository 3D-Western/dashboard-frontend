import PrintJobsTable from '@/components/PrintJobsTable';
import { Button } from '@/components/ui/button';
import { getPrintJobs } from '@/services/print-job-services';

export default async function DashboardPage() {
  const printJobs = await getPrintJobs();

  return (
    <div className="container p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="font-bold text-2xl sm:text-4xl">Prints</h1>
        <p className="text-muted-foreground">Manage your prints</p>
      </div>
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
