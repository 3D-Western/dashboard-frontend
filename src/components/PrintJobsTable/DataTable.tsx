'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataTablePagination } from '../DataTablePagination';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  className?: string;
}

const columnLabels: Record<string, string> = {
  name: 'Name',
  status: 'Status',
  orderPlaced: 'Print Date',
  stlFile: 'STL File',
};

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [announcement, setAnnouncement] = useState('');

  // Initialize column visibility with mobile defaults
  const getInitialColumnVisibility = (): VisibilityState => {
    if (typeof window === 'undefined') return {};

    const saved = localStorage.getItem('printJobsTableColumnVisibility');
    if (saved) {
      return JSON.parse(saved);
    }

    // Set mobile defaults: hide stlFile and orderPlaced on screens < 768px
    const isMobile = window.innerWidth < 768;
    return {
      stlFile: !isMobile,
      orderPlaced: !isMobile,
    };
  };

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    getInitialColumnVisibility,
  );

  // Save column visibility to localStorage
  useEffect(() => {
    localStorage.setItem('printJobsTableColumnVisibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, rowSelection, pagination, columnVisibility },
  });

  // Announce filtered results for screen readers
  useEffect(() => {
    const filteredCount = table.getFilteredRowModel().rows.length;
    const selectedCount = table.getFilteredSelectedRowModel().rows.length;

    if (filteredCount !== data.length) {
      setAnnouncement(`Showing ${filteredCount} of ${data.length} print jobs`);
    } else if (selectedCount > 0) {
      setAnnouncement(`${selectedCount} print job${selectedCount === 1 ? '' : 's'} selected`);
    } else {
      setAnnouncement('');
    }
  }, [table, data.length]);

  return (
    <div className="space-y-4">
      {/* Live region for screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <Label htmlFor="search-prints" className="sr-only">
            Search print jobs by name
          </Label>
          <Input
            id="search-prints"
            placeholder="Search prints..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
            className="w-full"
            aria-describedby="search-help"
          />
          <span id="search-help" className="sr-only">
            Filter print jobs by typing the name
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-8"
              aria-label="Toggle column visibility"
            >
              <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {columnLabels[column.id] || column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table aria-label="Print jobs table" aria-describedby="table-caption">
          <caption id="table-caption" className="sr-only">
            Your print jobs with status, dates, and file information. Sortable by print date.
          </caption>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  aria-selected={row.getIsSelected()}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}
