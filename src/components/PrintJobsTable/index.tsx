'use client';

import { PrintJob } from '@/types/jobs';
import { DataTable } from './DataTable';
import { useColumns } from './useColumns';

export interface PrintJobsTableProps {
  printJobs: PrintJob[];
  mode?: 'user' | 'admin';
}

export default function PrintJobsTable({ printJobs, mode = 'user' }: PrintJobsTableProps) {
  const columns = useColumns(mode);

  return <DataTable columns={columns} data={printJobs} />;
}
