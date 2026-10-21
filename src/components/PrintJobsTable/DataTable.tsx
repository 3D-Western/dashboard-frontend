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
  Row,
  SortingState,
  Table as TanStackTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { DataTablePagination } from '../DataTablePagination';
import { ResponsiveTable } from '@/components/ResponsiveTable';
import { PaginationMetadata } from '@/types/common';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination: PaginationMetadata;
  /** The phone (below md) version of one row. */
  renderCard: (row: Row<TData>) => ReactNode;
  className?: string;
}

/** Column ids that can be sorted from the phone's "Sort by" select, with their names. */
const SORT_LABELS: Record<string, string> = {
  name: 'Name',
  user: 'User',
  status: 'Status',
  jobPlaced: 'Print date',
};

/** On phones the column headers are hidden, so sorting moves to one select above the cards. */
function SortSelect<TData>({ table }: { table: TanStackTable<TData> }) {
  const active = table.getState().sorting[0];
  const value = active ? `${active.id}:${active.desc ? 'desc' : 'asc'}` : '';
  const options = table
    .getAllLeafColumns()
    .filter((column) => column.getCanSort() && SORT_LABELS[column.id])
    .flatMap((column) => [
      { value: `${column.id}:asc`, label: `${SORT_LABELS[column.id]}, ascending` },
      { value: `${column.id}:desc`, label: `${SORT_LABELS[column.id]}, descending` },
    ]);

  return (
    <div className="space-y-1.5 md:hidden">
      <label htmlFor="print-jobs-sort" className="text-sm font-medium">
        Sort by
      </label>
      <select
        id="print-jobs-sort"
        value={value}
        onChange={(event) => {
          const [id, direction] = event.target.value.split(':');
          table.setSorting(id ? [{ id, desc: direction === 'desc' }] : []);
        }}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base"
      >
        <option value="">Default order</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  renderCard,
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

      <SortSelect table={table} />

      <ResponsiveTable
        items={table.getRowModel().rows}
        getKey={(row) => row.id}
        renderCard={renderCard}
        emptyMessage="No results."
      >
        <div className="overflow-hidden rounded-lg border bg-card">
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
      </ResponsiveTable>

      <DataTablePagination table={table} pagination={pagination} />
    </div>
  );
}
