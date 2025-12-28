import PrintJobsTable from '@/components/PrintJobsTable';
import { jobApi } from '@/api/client/job';
import { withSessionErrorHandling } from '@/lib/server-utils';
import { Settings } from 'lucide-react';

interface PrintManagementPageProps {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}

export default async function PrintManagementPage({ searchParams }: PrintManagementPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;

  // Fetch all print jobs with server-side pagination
  const { data: printJobs, pagination } = await withSessionErrorHandling(() =>
    jobApi.listAllJobs({ page, pageSize }),
  );

  return (
    <div className="container space-y-6 p-6">
      <div className="mb-4 flex items-center gap-2 text-muted-foreground">
        <Settings className="h-5 w-5" />
        <span className="text-sm">Manage all print jobs across users</span>
      </div>

      <div>
        <PrintJobsTable printJobs={printJobs} pagination={pagination} mode="admin" />
      </div>
    </div>
  );
}
