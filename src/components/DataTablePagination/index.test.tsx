/* eslint-disable react-hooks/incompatible-library */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { DataTablePagination } from './index';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

let mockRouterPush: ReturnType<typeof vi.fn>;
let mockSearchParams: URLSearchParams;

beforeEach(() => {
  mockRouterPush = vi.fn();
  mockSearchParams = new URLSearchParams();

  (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
    push: mockRouterPush,
  });

  (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue({
    toString: () => mockSearchParams.toString(),
    get: (key: string) => mockSearchParams.get(key),
  });
});

type RowData = {
  id: number;
  name: string;
};

const columns: ColumnDef<RowData>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: (info) => info.getValue(),
  },
];

function PaginationHarness({
  data,
  page = 1,
  pageSize = 10,
  initialRowSelection = {},
  showSelectionCount = false,
}: {
  data: RowData[];
  page?: number;
  pageSize?: number;
  initialRowSelection?: Record<string, boolean>;
  showSelectionCount?: boolean;
}) {
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize,
  });
  const [rowSelection, setRowSelection] =
    React.useState<Record<string, boolean>>(initialRowSelection);

  const table = useReactTable({
    data,
    columns,
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  });

  // Calculate pagination metadata
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNext = page < totalPages;
  const hasPrevious = page > 1;

  const paginationMetadata = {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNext,
    hasPrevious,
    snapshotCreatedBefore: new Date().toISOString(),
  };

  return (
    <DataTablePagination
      table={table}
      pagination={paginationMetadata}
      showSelectionCount={showSelectionCount}
    />
  );
}

const buildRows = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Row ${index + 1}`,
  }));

describe('DataTablePagination', () => {
  it('displays current page and total pages', () => {
    render(<PaginationHarness data={buildRows(30)} />);

    expect(screen.getAllByText('Page 1 of 3').length).toBeGreaterThan(0);
  });

  it('disables previous controls on the first page', () => {
    render(<PaginationHarness data={buildRows(30)} />);

    expect(screen.getByLabelText(/go to previous page, currently on page 1 of 3/i)).toBeDisabled();
    expect(screen.getByLabelText(/go to first page, currently on page 1 of 3/i)).toBeDisabled();
  });

  it('navigates to the last page via router.push', async () => {
    const user = userEvent.setup();
    render(<PaginationHarness data={buildRows(30)} />);

    await user.click(screen.getByLabelText(/go to last page, currently on page 1 of 3/i));

    // Verify router.push was called with page=3
    expect(mockRouterPush).toHaveBeenCalledWith('?page=3');
  });

  it('updates rows per page selection via router.push', async () => {
    const user = userEvent.setup();
    render(<PaginationHarness data={buildRows(30)} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '25' }));

    // Verify router.push was called with pageSize=25 and page=1
    expect(mockRouterPush).toHaveBeenCalledWith('?page=1&pageSize=25');
  });

  it('shows selection count when rows are selected', () => {
    render(
      <PaginationHarness
        data={buildRows(30)}
        initialRowSelection={{ 0: true, 2: true }}
        showSelectionCount={true}
      />,
    );

    expect(screen.getByText('2 of 30 row(s) selected.')).toBeInTheDocument();
  });

  it('navigates to next page via router.push', async () => {
    const user = userEvent.setup();
    render(<PaginationHarness data={buildRows(30)} />);

    await user.click(screen.getByLabelText(/go to next page, currently on page 1 of 3/i));

    // Verify router.push was called with page=2
    expect(mockRouterPush).toHaveBeenCalledWith('?page=2');
  });
});
