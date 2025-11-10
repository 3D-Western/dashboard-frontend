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

interface ActionsCellProps {
  printJob: PrintJob;
  mode: TableMode;
  onRefresh: () => void;
}

function ActionsCell({ printJob, mode, onRefresh }: ActionsCellProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleStatusChange = async (newStatus: PrintJobStatus) => {
    try {
      await jobApi.updateJobStatus(printJob.id, newStatus);
      onRefresh();
    } catch (error) {
      console.error('Failed to update job status:', error);
      alert('Failed to update job status. Please try again.');
    }
  };

  const handleDelete = async () => {
    try {
      await jobApi.deleteJob(printJob.id);
      setDeleteDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete job:', error);
      alert('Failed to delete job. Please try again.');
    }
  };

  return (
    <>
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
          <DropdownMenuSeparator />
          {mode === 'admin' && (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleStatusChange('IN_QUEUE')}>
                    In Queue
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('PRINTING')}>
                    Printing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('READY')}>
                    Ready
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('FLAGGED')}>
                    Flagged
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('ERROR')}>
                    Error
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive"
              >
                Delete Job
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem disabled aria-disabled="true">
            Download STL (Coming soon)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteJobDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        jobName={printJob.name}
        onConfirm={handleDelete}
      />
    </>
  );
}

export const useColumns = (mode: TableMode = 'user') => {
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
          return <ActionsCell printJob={printJob} mode={mode} onRefresh={() => router.refresh()} />;
        },
      },
    ],
    [mode, router],
  );
};
