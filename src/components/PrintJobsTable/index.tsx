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

interface JobOverrides {
  statusOverrides: Record<string, PrintJob['status']>;
  removedIds: Set<string>;
}

const EMPTY_OVERRIDES: JobOverrides = { statusOverrides: {}, removedIds: new Set() };

export default function PrintJobsTable({
  printJobs,
  pagination,
  mode = 'user',
}: PrintJobsTableProps) {
  const [overrides, setOverrides] = useState<JobOverrides>(EMPTY_OVERRIDES);

  const applyOverrides = useCallback(
    (jobsToMap: PrintJob[], { statusOverrides, removedIds }: JobOverrides) =>
      jobsToMap
        .filter((job) => !removedIds.has(job.id))
        .map((job) => {
          const overriddenStatus = statusOverrides[job.id];
          return overriddenStatus ? { ...job, status: overriddenStatus } : job;
        }),
    [],
  );

  const jobs = useMemo(
    () => applyOverrides(printJobs, overrides),
    [printJobs, overrides, applyOverrides],
  );

  // setJobs models both status edits (row still present, status differs) and
  // removals (row missing from the updater's result) against the server-fetched
  // printJobs baseline, so either kind of local edit renders immediately.
  const setJobs = useCallback(
    (updater: (prev: PrintJob[]) => PrintJob[]) => {
      setOverrides((prevOverrides) => {
        const currentJobs = applyOverrides(printJobs, prevOverrides);
        const nextJobs = updater(currentJobs);
        const nextJobById = new Map(nextJobs.map((job) => [job.id, job]));
        const baseJobById = new Map(printJobs.map((job) => [job.id, job]));

        const nextStatusOverrides: Record<string, PrintJob['status']> = {};
        const nextRemovedIds = new Set<string>();

        for (const job of currentJobs) {
          const stillPresent = nextJobById.get(job.id);
          if (!stillPresent) {
            nextRemovedIds.add(job.id);
            continue;
          }
          const baseJob = baseJobById.get(job.id);
          if (baseJob && baseJob.status !== stillPresent.status) {
            nextStatusOverrides[job.id] = stillPresent.status;
          }
        }

        return { statusOverrides: nextStatusOverrides, removedIds: nextRemovedIds };
      });
    },
    [printJobs, applyOverrides],
  );

  const columns = useColumns({ mode, setJobs });
  return <DataTable columns={columns} data={jobs} pagination={pagination} />;
}
