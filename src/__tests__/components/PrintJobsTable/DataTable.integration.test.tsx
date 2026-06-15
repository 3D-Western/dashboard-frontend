import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import { DataTable } from '@/components/PrintJobsTable/DataTable';
import { PaginationMetadata } from '@/types/common';

type MockColumn = {
  id: string;
  accessorFn?: () => unknown;
  getCanHide: () => boolean;
  getIsVisible: () => boolean;
  toggleVisibility: (value: boolean) => void;
  columnDef?: { header?: React.ReactNode };
};

let mockTable: {
  getColumn: (
    id: string,
  ) => { getFilterValue: () => string; setFilterValue: (value: string) => void } | undefined;
  getAllColumns: () => MockColumn[];
  getHeaderGroups: () => Array<{
    id: string;
    headers: Array<{
      id: string;
      isPlaceholder: boolean;
      column: { columnDef: { header?: React.ReactNode } };
      getContext: () => unknown;
    }>;
  }>;
  getRowModel: () => {
    rows: Array<{
      id: string;
      getIsSelected: () => boolean;
      getVisibleCells: () => Array<{
        id: string;
        column: { columnDef: { cell?: React.ReactNode } };
        getContext: () => unknown;
      }>;
    }>;
  };
  getFilteredRowModel: () => { rows: unknown[] };
  getFilteredSelectedRowModel: () => { rows: unknown[] };
};

vi.mock('@tanstack/react-table', () => ({
  flexRender: (render: unknown, context: unknown) =>
    typeof render === 'function' ? (render as (ctx: unknown) => React.ReactNode)(context) : render,
  getCoreRowModel: () => vi.fn(),
  getFilteredRowModel: () => vi.fn(),
  getSortedRowModel: () => vi.fn(),
  useReactTable: () => mockTable,
}));

vi.mock('@/components/DataTablePagination', () => ({
  DataTablePagination: () => <div data-testid="pagination" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuCheckboxItem: ({
    children,
    checked,
    onCheckedChange,
  }: {
    children: React.ReactNode;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <button onClick={() => onCheckedChange?.(!checked)} type="button">
      {children}
    </button>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.ComponentProps<'label'>) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children, ...props }: React.ComponentProps<'table'>) => (
    <table {...props}>{children}</table>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, ...props }: React.ComponentProps<'td'>) => <td {...props}>{children}</td>,
  TableHead: ({ children, ...props }: React.ComponentProps<'th'>) => <th {...props}>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children, ...props }: React.ComponentProps<'tr'>) => <tr {...props}>{children}</tr>,
}));

const pagination: PaginationMetadata = {
  page: 1,
  pageSize: 10,
  totalItems: 10,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
  snapshotCreatedBefore: new Date('2024-01-01T00:00:00Z').toISOString(),
};

const setupTable = (overrides: Partial<typeof mockTable> = {}) => {
  const mockSetFilterValue = vi.fn();
  const mockToggleVisibility = vi.fn();

  mockTable = {
    getColumn: () => ({
      getFilterValue: () => '',
      setFilterValue: mockSetFilterValue,
    }),
    getAllColumns: () => [
      {
        id: 'name',
        accessorFn: () => null,
        getCanHide: () => true,
        getIsVisible: () => true,
        toggleVisibility: mockToggleVisibility,
      },
      {
        id: 'custom',
        accessorFn: () => null,
        getCanHide: () => true,
        getIsVisible: () => false,
        toggleVisibility: vi.fn(),
      },
    ],
    getHeaderGroups: () => [
      {
        id: 'header-group',
        headers: [
          {
            id: 'placeholder',
            isPlaceholder: true,
            column: { columnDef: { header: 'Placeholder' } },
            getContext: () => ({}),
          },
          {
            id: 'name',
            isPlaceholder: false,
            column: { columnDef: { header: 'Name' } },
            getContext: () => ({}),
          },
        ],
      },
    ],
    getRowModel: () => ({
      rows: [
        {
          id: 'row-1',
          getIsSelected: () => true,
          getVisibleCells: () => [
            {
              id: 'cell-1',
              column: { columnDef: { cell: 'Cell' } },
              getContext: () => ({}),
            },
          ],
        },
      ],
    }),
    getFilteredRowModel: () => ({ rows: [] }),
    getFilteredSelectedRowModel: () => ({ rows: [] }),
    ...overrides,
  };

  return { mockSetFilterValue, mockToggleVisibility };
};

describe('DataTable', () => {
  beforeEach(() => {
    setupTable();
    localStorage.clear();
  });

  it('announces filtered results when the list is narrowed', async () => {
    setupTable({
      getFilteredRowModel: () => ({ rows: [{ id: 'filtered' }] }),
      getFilteredSelectedRowModel: () => ({ rows: [] }),
    });

    render(<DataTable columns={[]} data={[{ id: 1 }, { id: 2 }]} pagination={pagination} />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 2 print jobs');
    });
  });

  it('announces selected rows with correct pluralization', async () => {
    setupTable({
      getFilteredRowModel: () => ({ rows: [{}, {}] }),
      getFilteredSelectedRowModel: () => ({ rows: [{}] }),
    });

    const { unmount } = render(
      <DataTable columns={[]} data={[{ id: 1 }, { id: 2 }]} pagination={pagination} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('1 print job selected');
    });

    unmount();

    setupTable({
      getFilteredRowModel: () => ({ rows: [{}, {}] }),
      getFilteredSelectedRowModel: () => ({ rows: [{}, {}] }),
    });

    render(<DataTable columns={[]} data={[{ id: 1 }, { id: 2 }]} pagination={pagination} />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('2 print jobs selected');
    });
  });
});
