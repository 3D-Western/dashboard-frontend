'use client';

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
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { DataTablePagination } from '../DataTablePagination';
import { PaginationMetadata } from '@/types/common';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination: PaginationMetadata;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
}: DataTableProps<TData, TValue>) {
  'use no memo';
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [announcement, setAnnouncement] = useState('');

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is known to be incompatible with React Compiler
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, rowSelection },
    // Disable client-side pagination - using server-side pagination
    manualPagination: true,
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

      <DataTablePagination table={table} pagination={pagination} />
    </div>
  );
}
