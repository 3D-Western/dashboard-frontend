'use client';

import { PrintJob } from '@/types/jobs';
import { PaginationMetadata } from '@/types/common';
import { DataTable } from './DataTable';
import { useColumns } from './useColumns';
import { useState, useEffect } from 'react';

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
  // Keep jobs in state so we can update status locally (e.g., optimistic updates for cancel)
  const [jobs, setJobs] = useState<PrintJob[]>(printJobs);

  // Sync state with props when printJobs change (e.g., from filters or pagination)
  useEffect(() => {
    setJobs(printJobs);
  }, [printJobs]);

  const columns = useColumns({ mode, setJobs });
  return <DataTable columns={columns} data={jobs} pagination={pagination} />;
}
