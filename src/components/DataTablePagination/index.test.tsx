/* eslint-disable react-hooks/incompatible-library */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { DataTablePagination } from './index';

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
  initialPageSize = 10,
  initialRowSelection = {},
}: {
  data: RowData[];
  initialPageSize?: number;
  initialRowSelection?: Record<string, boolean>;
}) {
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: initialPageSize,
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

  return <DataTablePagination table={table} />;
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

  it('navigates to the last page and disables next controls', async () => {
    const user = userEvent.setup();
    render(<PaginationHarness data={buildRows(30)} />);

    await user.click(screen.getByLabelText(/go to last page, currently on page 1 of 3/i));

    await waitFor(() => {
      expect(screen.getAllByText('Page 3 of 3').length).toBeGreaterThan(0);
    });

    expect(screen.getByLabelText(/go to next page, currently on page 3 of 3/i)).toBeDisabled();
  });

  it('updates rows per page selection', async () => {
    const user = userEvent.setup();
    render(<PaginationHarness data={buildRows(30)} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '25' }));

    await waitFor(() => {
      expect(screen.getAllByText('Page 1 of 2').length).toBeGreaterThan(0);
    });
  });

  it('shows selection count when rows are selected', () => {
    render(<PaginationHarness data={buildRows(30)} initialRowSelection={{ 0: true, 2: true }} />);

    expect(screen.getByText('2 of 30 row(s) selected.')).toBeInTheDocument();
  });

  it('announces page changes in the live region', async () => {
    const user = userEvent.setup();
    render(<PaginationHarness data={buildRows(30)} />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Page 1 of 3');

    await user.click(screen.getByLabelText(/go to next page, currently on page 1 of 3/i));

    await waitFor(() => {
      expect(status).toHaveTextContent('Page 2 of 3');
    });
  });
});
