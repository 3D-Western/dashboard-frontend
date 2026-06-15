import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { DataTablePagination } from '@/components/DataTablePagination';

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams('page=2&pageSize=25&filter=active');

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/components/ui/select', () => {
  const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  );
  const Select = ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => {
    let options: React.ReactNode[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === SelectContent) {
        options = React.Children.toArray(
          (child as React.ReactElement<{ children?: React.ReactNode }>).props.children,
        );
      }
    });
    return (
      <select
        aria-label="Rows per page"
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {options}
      </select>
    );
  };
  const SelectTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const SelectValue = ({ placeholder }: { placeholder?: string | number }) => (
    <span>{placeholder}</span>
  );

  return { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
});

describe('DataTablePagination', () => {
  const table = {
    getFilteredSelectedRowModel: () => ({ rows: [1] }),
    getFilteredRowModel: () => ({ rows: [1, 2, 3] }),
  };

  const pagination = {
    page: 2,
    pageSize: 25,
    totalItems: 100,
    totalPages: 5,
    hasNext: true,
    hasPrevious: true,
    snapshotCreatedBefore: new Date('2024-01-01T00:00:00Z').toISOString(),
  };

  beforeEach(() => {
    mockPush.mockClear();
  });

  it('navigates to first and previous page', async () => {
    const user = userEvent.setup();
    render(<DataTablePagination table={table as never} pagination={pagination} />);

    await user.click(
      screen.getByRole('button', { name: /go to first page, currently on page 2 of 5/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /go to previous page, currently on page 2 of 5/i }),
    );

    const calls = mockPush.mock.calls.map(([value]) => value as string);
    expect(calls.some((value) => value.includes('page=1'))).toBe(true);
    expect(calls.some((value) => value.includes('page=1') && value.includes('pageSize=25'))).toBe(
      true,
    );
  });

  it('updates page size and resets page to 1', async () => {
    const user = userEvent.setup();
    render(<DataTablePagination table={table as never} pagination={pagination} />);

    await user.selectOptions(screen.getByLabelText(/rows per page/i), '50');

    const pushArg = mockPush.mock.calls.at(-1)?.[0] as string;
    expect(pushArg).toContain('page=1');
    expect(pushArg).toContain('pageSize=50');
  });
});
