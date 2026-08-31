'use client';

import { PrintJobStatusBadge } from '@/components/PrintJobStatusBadge';
import { Button } from '@/components/ui/button';
import { PrintJob, PrintJobStatus } from '@/types/jobs';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { useMemo } from 'react';
import { DateCell } from './DateCell';
import { ActionsCell } from './ActionsCell';

type TableMode = 'user' | 'admin';

interface UseColumnsOptions {
  mode?: TableMode;
  setJobs?: (updater: (prev: PrintJob[]) => PrintJob[]) => void;
}

export const useColumns = (opts: UseColumnsOptions = {}) => {
  const { mode = 'user', setJobs } = opts;

  return useMemo<ColumnDef<PrintJob>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => {
          const sortDirection = column.getIsSorted();
          return (
            <Button
              variant={'ghost'}
              className="w-full justify-start px-0 hover:bg-transparent"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              aria-label={`Sort by name ${
                sortDirection === 'asc'
                  ? 'descending'
                  : sortDirection === 'desc'
                    ? 'ascending'
                    : 'ascending'
              }`}
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const name = row.getValue('name') as string;

          if (mode === 'admin') {
            return <div>{name}</div>;
          }

          return (
            <div>
              <span>{name}</span>
            </div>
          );
        },
      },
      ...(mode === 'admin'
        ? [
            {
              accessorKey: 'user',
              header: ({ column }) => {
                const sortDirection = column.getIsSorted();
                return (
                  <Button
                    variant={'ghost'}
                    className="w-full justify-start px-0 hover:bg-transparent"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    aria-label={`Sort by user ${
                      sortDirection === 'asc'
                        ? 'descending'
                        : sortDirection === 'desc'
                          ? 'ascending'
                          : 'ascending'
                    }`}
                  >
                    User
                    <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                );
              },
              cell: ({ row }) => {
                const user = row.original.user;
                return (
                  <div>
                    <span>{`${user.firstName} ${user.lastName}`}</span>
                  </div>
                );
              },
              sortingFn: (rowA, rowB) => {
                const userA = rowA.original.user;
                const userB = rowB.original.user;
                const nameA = `${userA.firstName} ${userA.lastName}`.toLowerCase();
                const nameB = `${userB.firstName} ${userB.lastName}`.toLowerCase();
                return nameA.localeCompare(nameB);
              },
            } as ColumnDef<PrintJob>,
          ]
        : []),
      {
        accessorKey: 'status',
        header: ({ column }) => {
          const sortDirection = column.getIsSorted();
          return (
            <Button
              variant={'ghost'}
              className="w-full"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              aria-label={`Sort by status ${
                sortDirection === 'asc'
                  ? 'descending'
                  : sortDirection === 'desc'
                    ? 'ascending'
                    : 'ascending'
              }`}
            >
              Status
              <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const status = row.getValue('status') as PrintJobStatus;
          return (
            <div className="flex w-full justify-center">
              <PrintJobStatusBadge status={status} />
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const statusOrder: Record<PrintJobStatus, number> = {
            Error: 0,
            Failed: 1,
            Cancelled: 2,
            Flagged: 3,
            PendingFile: 4,
            InQueue: 5,
            Printing: 6,
            Ready: 7,
            Succeeded: 8,
          };
          const statusA = rowA.getValue('status') as PrintJobStatus;
          const statusB = rowB.getValue('status') as PrintJobStatus;
          return statusOrder[statusA] - statusOrder[statusB];
        },
      },
      {
        accessorKey: 'jobPlaced',
        header: ({ column }) => {
          const sortDirection = column.getIsSorted();
          return (
            <Button
              variant={'ghost'}
              className="w-full"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              aria-label={`Sort by print date ${
                sortDirection === 'asc'
                  ? 'descending'
                  : sortDirection === 'desc'
                    ? 'ascending'
                    : 'ascending'
              }`}
            >
              Print Date
              <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          );
        },
        cell: ({ row }) => <DateCell date={row.getValue('jobPlaced') as string} />,
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const printJob = row.original;

          const handleStatusChanged = (jobId: string, newStatus: PrintJobStatus) => {
            if (setJobs) {
              setJobs((prev) => {
                return prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j));
              });
            }
          };

          const handleJobDeleted = (jobId: string) => {
            if (setJobs) {
              setJobs((prev) => prev.filter((j) => j.id !== jobId));
            }
          };

          return (
            <ActionsCell
              printJob={printJob}
              mode={mode}
              onStatusChanged={handleStatusChanged}
              onJobDeleted={handleJobDeleted}
            />
          );
        },
      },
    ],
    [mode, setJobs],
  );
};
