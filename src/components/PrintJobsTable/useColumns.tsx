'use client';

import { PrintJobStatusBadge } from '@/components/PrintJobStatusBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PrintJob, PrintJobStatus } from '@/types/jobs';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { DateCell } from './DateCell';

type TableMode = 'user' | 'admin';

interface UseColumnsOptions {
  mode?: TableMode;
  setJobs?: (updater: (prev: PrintJob[]) => PrintJob[]) => void;
}

export const useColumns = (opts: UseColumnsOptions = {}) => {
  const { mode = 'user' } = opts;

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
          const jobId = row.original.id;

          if (mode === 'admin') {
            return (
              <div>
                <Link
                  href={`/admin/prints/${jobId}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {name}
                </Link>
              </div>
            );
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
              accessorKey: 'student',
              header: ({ column }) => {
                const sortDirection = column.getIsSorted();
                return (
                  <Button
                    variant={'ghost'}
                    className="w-full justify-start px-0 hover:bg-transparent"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    aria-label={`Sort by student ${
                      sortDirection === 'asc'
                        ? 'descending'
                        : sortDirection === 'desc'
                          ? 'ascending'
                          : 'ascending'
                    }`}
                  >
                    Student
                    <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                );
              },
              cell: ({ row }) => {
                const student = row.original.student;
                if (!student) {
                  return <div className="text-muted-foreground">-</div>;
                }
                return (
                  <div>
                    <span>{`${student.firstName} ${student.lastName}`}</span>
                  </div>
                );
              },
              sortingFn: (rowA, rowB) => {
                const studentA = rowA.original.student;
                const studentB = rowB.original.student;
                if (!studentA && !studentB) return 0;
                if (!studentA) return 1;
                if (!studentB) return -1;
                const nameA = `${studentA.firstName} ${studentA.lastName}`.toLowerCase();
                const nameB = `${studentB.firstName} ${studentB.lastName}`.toLowerCase();
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
            Flagged: 2,
            PendingFile: 3,
            InQueue: 4,
            Printing: 5,
            Ready: 6,
            Succeeded: 7,
          };
          const statusA = rowA.getValue('status') as PrintJobStatus;
          const statusB = rowB.getValue('status') as PrintJobStatus;
          return statusOrder[statusA] - statusOrder[statusB];
        },
      },
      {
        accessorKey: 'orderPlaced',
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
        cell: ({ row }) => <DateCell date={row.getValue('orderPlaced') as string} />,
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const printJob = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label={`Actions for ${printJob.name}`}
                  aria-haspopup="menu"
                >
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={async () => {
                    try {
                      await navigator.clipboard.writeText(printJob.id);
                    } catch (error) {
                      console.error('Failed to copy Job ID to clipboard', error);
                    }
                  }}
                >
                  Copy Job ID
                </DropdownMenuItem>
                {/* TODO: Future improvement - Implement cancel print functionality */}
                {/* {canCancel && setJobs && (
                  <DropdownMenuItem
                    // Uncomment and replace below onclick handle once backend is ready to enable api call
                    // onClick={async () => {
                    //   try {
                    //     console.log('Cancel Print: Attempting to cancel job', printJob.id);
                    //     const result = await jobApi.cancelJob(printJob.id);
                    //     console.log('Cancel Print: API result', result);
                    //     setJobs(prev => {
                    //       const updated = prev.map(j =>
                    //         j.id === printJob.id ? { ...j, status: 'Failed' as PrintJobStatus } : j
                    //       );
                    //       console.log('Cancel Print: Updated jobs state', updated);
                    //       return updated;
                    //     });
                    //   } catch (e) {
                    //     console.error('Cancel Print: API error', e);
                    //   }
                    // }}
                    onClick={() => {
                      setJobs((prev) => {
                        const updated = prev.map((j) =>
                          j.id === printJob.id ? { ...j, status: 'Failed' as PrintJobStatus } : j,
                        );
                        return updated;
                      });
                    }}
                  >
                    Cancel Print
                  </DropdownMenuItem>
                )} */}
                {/* TODO: Future improvement - Implement download STL functionality */}
                {/* <DropdownMenuSeparator />
                <DropdownMenuItem disabled aria-disabled="true">
                  Download STL (Coming soon)
                </DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [mode],
  );
};
