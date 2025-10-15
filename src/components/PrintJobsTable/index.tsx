'use client';

import { PrintJob } from '@/types/jobs';
import { DataTable } from './DataTable';
import { useColumns } from './useColumns';

export interface PrintJobsTableProps {
  printJobs: PrintJob[];
}

export default function PrintJobsTable({ printJobs }: PrintJobsTableProps) {
  const columns = useColumns();

  return <DataTable columns={columns} data={printJobs} />;
}
