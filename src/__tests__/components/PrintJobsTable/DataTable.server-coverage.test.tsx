import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DataTable } from '@/components/PrintJobsTable/DataTable';
import { PaginationMetadata } from '@/types/common';

let mockTable: {
  getColumn: () => { getFilterValue: () => string; setFilterValue: (value: string) => void };
  getAllColumns: () => Array<{ id: string; accessorFn?: () => unknown; getCanHide: () => boolean; getIsVisible: () => boolean; toggleVisibility: (value: boolean) => void }>;
  getHeaderGroups: () => Array<{ id: string; headers: Array<{ id: string; isPlaceholder: boolean; column: { columnDef: { header?: React.ReactNode } }; getContext: () => unknown }> }>;
  getRowModel: () => { rows: unknown[] };
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
  DataTablePagination: () => null,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuCheckboxItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.ComponentProps<'label'>) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

const pagination: PaginationMetadata = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
  snapshotCreatedBefore: new Date('2024-01-01T00:00:00Z').toISOString(),
};

describe('DataTable server rendering', () => {
  it('handles missing window during initial column visibility', () => {
    vi.stubGlobal('window', undefined as unknown as Window);

    mockTable = {
      getColumn: () => ({
        getFilterValue: () => '',
        setFilterValue: () => undefined,
      }),
      getAllColumns: () => [],
      getHeaderGroups: () => [],
      getRowModel: () => ({ rows: [] }),
      getFilteredRowModel: () => ({ rows: [] }),
      getFilteredSelectedRowModel: () => ({ rows: [] }),
    };

    expect(() =>
      renderToString(<DataTable columns={[]} data={[]} pagination={pagination} />),
    ).not.toThrow();

    vi.unstubAllGlobals();
  });
});
