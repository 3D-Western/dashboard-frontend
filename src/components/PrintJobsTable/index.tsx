'use client';

import { PrintJob } from '@/types/jobs';
import { PaginationMetadata } from '@/types/common';
import { DataTable } from './DataTable';
import { useColumns } from './useColumns';
import { useState } from 'react';

export interface PrintJobsTableProps {
  printJobs: PrintJob[];
  pagination: PaginationMetadata;
  mode?: 'user' | 'admin';
}

export default function PrintJobsTable({
  printJobs,
  pagination,
  mode = 'user',
}: PrintJobsTableProps) {
  // Keep jobs in state so we can update status locally
  const [jobs, setJobs] = useState<PrintJob[]>(printJobs);
  const columns = useColumns({ mode, setJobs });
  return <DataTable columns={columns} data={jobs} pagination={pagination} />;
}
