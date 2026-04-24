import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import { renderHook } from '@testing-library/react';
import { useColumns } from '@/components/PrintJobsTable/useColumns';
import { createMockPrintJob } from '@test/utils/mockFactories';

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

vi.mock('@/components/PrintJobsTable/ChangeStatusDialog', () => ({
  ChangeStatusDialog: () => null,
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

  it('logs an error when clipboard copy fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const columns = getColumns();
    const actionsColumn = columns.find((column) => column.id === 'actions');

    const printJob = createMockPrintJob({
      id: 'job-123',
      name: 'Test Job',
      status: 'InQueue',
    });

    const cellRenderer = actionsColumn?.cell;
    if (typeof cellRenderer !== 'function') {
      throw new Error('Expected actions column to render a cell function');
    }
    const cell = cellRenderer({
      row: { original: printJob },
    } as never);

    // Render the cell component
    render(<>{cell}</>);

    // Find and click the "Copy Job ID" button
    const copyButton = screen.getByText('Copy Job ID');
    expect(copyButton).toBeInTheDocument();

    // Click the button which will trigger the onSelect handler
    copyButton.click();

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to copy Job ID to clipboard',
        expect.any(Error),
      );
    });
  });
});
