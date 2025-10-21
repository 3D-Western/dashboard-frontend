'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { File, PrintJob, PrintJobStatus } from '@/types/jobs';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { useMemo } from 'react';
import { DateCell } from './DateCell';

const mapPrintJobStatusToDisplayLabel = (status: PrintJobStatus) => {
  switch (status) {
    case 'IN_QUEUE':
      return 'In Queue';
    case 'PRINTING':
      return 'Printing';
    case 'READY':
      return 'Ready';
    case 'FLAGGED':
      return 'Flagged';
    case 'ERROR':
      return 'Error';
    default:
      return 'Unknown';
  }
};

export const useColumns = () => {
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
        cell: ({ row }) => (
          <div className="w-full text-center">
            <span>{row.getValue('name') as string}</span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: () => {
          return <div className="w-full text-center">Status</div>;
        },
        cell: ({ row }) => {
          const status = row.getValue('status') as PrintJobStatus;
          const statusLabel = mapPrintJobStatusToDisplayLabel(status);
          return (
            <div className="w-full text-center">
              <span role="status" aria-label={`Print job status: ${statusLabel}`}>
                {statusLabel}
              </span>
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
    [],
  );
};
