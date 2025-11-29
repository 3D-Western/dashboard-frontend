'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { jobApi } from '@/api/client/job';
import { File, PrintJob, PrintJobStatus } from '@/types/jobs';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DateCell } from './DateCell';
import { PrintJobStatusBadge } from '@/components/PrintJobStatusBadge';
import { DeleteJobDialog } from './DeleteJobDialog';

type TableMode = 'user' | 'admin';



interface UseColumnsOptions {
  mode?: TableMode;
  setJobs?: (updater: (prev: PrintJob[]) => PrintJob[]) => void;
}

export const useColumns = (opts: UseColumnsOptions = {}) => {
  const { mode = 'user', setJobs } = opts;
  const router = useRouter();

  return useMemo<ColumnDef<PrintJob>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label={
              table.getIsAllPageRowsSelected()
                ? 'Deselect all print jobs on this page'
                : 'Select all print jobs on this page'
            }
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Select print job ${row.original.name}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'name',
        header: () => {
          return <div className="w-full text-center">Name</div>;
        },
        cell: ({ row }) => {
          const name = row.getValue('name') as string;
          const jobId = row.original.id;

          if (mode === 'admin') {
            return (
              <div className="w-full text-center">
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
            <div className="w-full text-center">
              <span>{name}</span>
            </div>
          );
        },
      },
      ...(mode === 'admin'
        ? [
            {
              accessorKey: 'student',
              header: () => {
                return <div className="w-full text-center">Student</div>;
              },
              cell: ({ row }) => {
                const student = row.original.student;
                if (!student) {
                  return <div className="w-full text-center text-muted-foreground">-</div>;
                }
                return (
                  <div className="w-full text-center">
                    <span>{`${student.firstName} ${student.lastName}`}</span>
                  </div>
                );
              },
            } as ColumnDef<PrintJob>,
          ]
        : []),
      {
        accessorKey: 'status',
        header: () => {
          return <div className="w-full text-center">Status</div>;
        },
        cell: ({ row }) => {
          const status = row.getValue('status') as PrintJobStatus;
          return (
            <div className="flex w-full justify-center">
              <PrintJobStatusBadge status={status} />
            </div>
          );
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
        accessorKey: 'stlFile',
        header: 'STL File',
        cell: ({ row }) => {
          const stlFile = row.getValue('stlFile') as File;
          return <span>{stlFile.path}</span>;
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const printJob = row.original;
          const canCancel = printJob.status === 'IN_QUEUE';
          const isCancelled = printJob.status === 'CANCELLED';
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
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(printJob.id)}>
                  Copy Job ID
                </DropdownMenuItem>
                {canCancel && setJobs && (
                  <DropdownMenuItem
                  // Uncomment and replace below onclick handle once backend is ready to enable api call
                    // onClick={async () => {
                    //   try {
                    //     console.log('Cancel Print: Attempting to cancel job', printJob.id);
                    //     const result = await jobApi.cancelJob(printJob.id);
                    //     console.log('Cancel Print: API result', result);
                    //     setJobs(prev => {
                    //       const updated = prev.map(j =>
                    //         j.id === printJob.id ? { ...j, status: 'CANCELLED' as PrintJobStatus } : j
                    //       );
                    //       console.log('Cancel Print: Updated jobs state', updated);
                    //       return updated;
                    //     });
                    //   } catch (e) {
                    //     console.error('Cancel Print: API error', e);
                    //   }
                    // }}
                    onClick={() => {
                      setJobs(prev => {
                        const updated = prev.map(j =>
                          j.id === printJob.id ? { ...j, status: 'CANCELLED' as PrintJobStatus } : j
                        );
                        return updated;
                      });
                    }}
                    disabled={isCancelled}
                  >
                    Cancel Print
                  </DropdownMenuItem>
                )}
                {isCancelled && (
                  <DropdownMenuItem disabled>
                    <span className="text-muted-foreground">Cancelled</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled aria-disabled="true">
                  Download STL (Coming soon)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [mode, router],
  );
};