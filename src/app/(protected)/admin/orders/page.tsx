import type { Metadata } from 'next';
import PrintJobsTable from '@/components/PrintJobsTable';
import { jobApi } from '@/api/client/job';
import { withSessionErrorHandling } from '@/lib/server-utils';
import { AdminOrderFilters } from './components/AdminOrderFilters';
import { PrintJobStatus } from '@/types/jobs';
import PageTitle from '@/components/PageTitle';

export const metadata: Metadata = {
  title: 'Order Management',
  description: 'Manage all orders across users',
};

interface OrderManagementPageProps {
  searchParams: Promise<{ page?: string; pageSize?: string; status?: string; search?: string }>;
}

export default async function OrderManagementPage({ searchParams }: OrderManagementPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;
  const status = params.status as PrintJobStatus | undefined;
  const search = params.search;

  // Fetch all orders with server-side pagination and filters
  const { data: printJobs, pagination } = await withSessionErrorHandling(() =>
    jobApi.listAllJobs({ page, pageSize, status, search }),
  );

  console.log('Fetched print jobs for admin:', printJobs);

  return (
    <div className="container space-y-6 p-6">
      <PageTitle title="Order Management" description="Manage all orders across users" />

      <AdminOrderFilters />

      <div>
        <PrintJobsTable printJobs={printJobs} pagination={pagination} mode="admin" />
      </div>
    </div>
  );
}
