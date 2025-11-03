import PrintJobsTable from '@/components/PrintJobsTable';
import { jobApi } from '@/api/client/job';
import { withSessionErrorHandling } from '@/lib/server-utils';
import { Settings } from 'lucide-react';

export default async function PrintManagementPage() {
  const { jobs: printJobs } = await withSessionErrorHandling(() => jobApi.listAllJobs());

  return (
    <div className="container space-y-6 p-6">
      <div className="mb-4 flex items-center gap-2 text-muted-foreground">
        <Settings className="h-5 w-5" />
        <span className="text-sm">Manage all print jobs across users</span>
      </div>

      <div>
        <PrintJobsTable printJobs={printJobs} mode="admin" />
      </div>
    </div>
  );
}
