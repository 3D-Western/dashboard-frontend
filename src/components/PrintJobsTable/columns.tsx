'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocalTime } from '@/hooks/useLocalTime';
import { File, PrintJob, PrintJobStatus } from '@/types/jobs';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

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
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
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
      return <div className="w-full text-center">{mapPrintJobStatusToDisplayLabel(status)}</div>;
    },
  },
  {
    accessorKey: 'orderPlaced',
    header: ({ column }) => {
      return (
        <Button
          variant={'ghost'}
          className="w-full"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Print Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: function OrderPlacedCell({ row }) {
      const localTime = useLocalTime(row.getValue('orderPlaced') as string);
      return (
        <div className="w-full text-center">
          <span>{localTime}</span>
        </div>
      );
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
