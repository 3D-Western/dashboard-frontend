'use client';

import { useLocalTime } from '@/hooks/useLocalTime';
import { File, PrintJob, PrintJobStatus } from '@/types/jobs';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export const columns: ColumnDef<PrintJob>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span>{row.getValue('name') as string}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as PrintJobStatus;
      return mapPrintJobStatusToDisplayLabel(status);
    },
  },
  {
    accessorKey: 'orderPlaced',
    header: 'Print Date',
    cell: function OrderPlacedCell({ row }) {
      const localTime = useLocalTime(row.getValue('orderPlaced') as string);
      return <span>{localTime}</span>;
    },
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
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(printJob.id)}>
              Copy Job ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Download STL</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
