'use client';

import { PrintJob } from '@/types/jobs';
import { DataTable } from './DataTable';
import { useColumns } from './useColumns';
import { useState } from 'react';

export interface PrintJobsTableProps {
  printJobs: PrintJob[];
}

export default function PrintJobsTable({ printJobs }: PrintJobsTableProps) {
  // keep local state so we can update a single job without a full page refresh
  const [jobs, setJobs] = useState<PrintJob[]>(printJobs);

  const columns = useColumns({ setPrintJobs: setJobs });

  return <DataTable columns={columns} data={jobs} />;
}
