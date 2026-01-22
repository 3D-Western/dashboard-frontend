import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@test/utils/render';
import { renderHook } from '@testing-library/react';
import { useColumns } from '@/components/PrintJobsTable/useColumns';
import { PrintJob } from '@/types/jobs';

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
    disabled,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={() => onSelect?.()} disabled={disabled} type="button">
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

describe('useColumns', () => {
  const getColumns = (options?: Parameters<typeof useColumns>[0]) => {
    const { result } = renderHook(() => useColumns(options));
    return result.current;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const clipboard = {
      writeText: vi.fn(() => {
        throw new Error('fail');
      }),
    };
    Object.defineProperty(window.navigator, 'clipboard', {
      value: clipboard,
      configurable: true,
    });
    Object.defineProperty(global.navigator, 'clipboard', {
      value: clipboard,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders placeholder when student data is missing in admin mode', () => {
    const columns = getColumns({ mode: 'admin' });
    const studentColumn = columns.find((column) => column.accessorKey === 'student');

    expect(studentColumn).toBeDefined();

    const cell = studentColumn?.cell?.({
      row: { original: { student: null } },
    } as never);

    render(<>{cell}</>);

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('logs an error when clipboard copy fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const columns = getColumns();
    const actionsColumn = columns.find((column) => column.id === 'actions');

    const printJob = {
      id: 'job-123',
      name: 'Test Job',
      status: 'InQueue',
      orderPlaced: new Date().toISOString(),
    } as PrintJob;

    const cell = actionsColumn?.cell?.({
      row: { original: printJob },
    } as never);

    const findOnSelect = (node: React.ReactNode): (() => Promise<void> | void) | null => {
      if (!node || typeof node !== 'object') return null;
      if (React.isValidElement(node) && typeof node.props.onSelect === 'function') {
        return node.props.onSelect as () => Promise<void> | void;
      }
      if (!React.isValidElement(node)) return null;
      const children = React.Children.toArray(node.props.children);
      for (const child of children) {
        const found = findOnSelect(child);
        if (found) return found;
      }
      return null;
    };

    const onSelect = findOnSelect(cell ?? null);
    expect(onSelect).toBeDefined();

    await onSelect?.();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to copy Job ID to clipboard',
      expect.any(Error),
    );
  });
});
