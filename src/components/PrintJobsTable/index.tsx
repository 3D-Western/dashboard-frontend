'use client';

import { PrintJob } from '@/types/jobs';
import { PaginationMetadata } from '@/types/common';
import { DataTable } from './DataTable';
import { useColumns } from './useColumns';
import { useCallback, useMemo, useState } from 'react';

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
  const [jobStatusOverrides, setJobStatusOverrides] = useState<Record<string, PrintJob['status']>>(
    {},
  );

  const jobs = useMemo(
    () =>
      printJobs.map((job) => {
        const overriddenStatus = jobStatusOverrides[job.id];
        return overriddenStatus ? { ...job, status: overriddenStatus } : job;
      }),
    [printJobs, jobStatusOverrides],
  );

  const setJobs = useCallback(
    (updater: (prev: PrintJob[]) => PrintJob[]) => {
      setJobStatusOverrides((prevOverrides) => {
        const currentJobs = printJobs.map((job) => {
          const overriddenStatus = prevOverrides[job.id];
          return overriddenStatus ? { ...job, status: overriddenStatus } : job;
        });
        const nextJobs = updater(currentJobs);

        const nextOverrides: Record<string, PrintJob['status']> = {};
        for (const nextJob of nextJobs) {
          const baseJob = printJobs.find((job) => job.id === nextJob.id);
          if (baseJob && baseJob.status !== nextJob.status) {
            nextOverrides[nextJob.id] = nextJob.status;
          }
        }

        return nextOverrides;
      });
    },
    [printJobs],
  );

  const columns = useColumns({ mode, setJobs });
  return <DataTable columns={columns} data={jobs} pagination={pagination} />;
}
