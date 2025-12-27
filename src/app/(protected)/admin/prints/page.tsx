import PrintJobsTable from '@/components/PrintJobsTable';
import { jobApi } from '@/api/client/job';
import { withSessionErrorHandling } from '@/lib/server-utils';
import { Settings } from 'lucide-react';

export default async function PrintManagementPage() {
  // Fetch all print jobs with pagination
  // For now, we fetch with a large pageSize to get all jobs for client-side pagination
  // TODO: Implement proper server-side pagination with URL search params
  const { data: printJobs } = await withSessionErrorHandling(() =>
    jobApi.listAllJobs({ pageSize: 100 }),
  );

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
