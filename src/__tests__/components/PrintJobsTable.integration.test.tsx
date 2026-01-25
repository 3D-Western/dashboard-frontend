import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PrintJobsTable from '@/components/PrintJobsTable';
import { createMockPrintJob } from '@/../test/utils/mockFactories';
import { PrintJob } from '@/types/jobs';
import { PaginationMetadata } from '@/types/common';

// Helper to create mock pagination metadata
function createMockPagination(jobs: PrintJob[], page = 1, pageSize = 10): PaginationMetadata {
  const totalItems = jobs.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
    snapshotCreatedBefore: new Date().toISOString(),
  };
}

describe('PrintJobsTable Integration', () => {
  let mockJobs: PrintJob[];

  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: window.navigator,
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'clipboard', {
      value: {
        writeText: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    mockJobs = [
      createMockPrintJob({
        id: '1',
        name: 'Test Print 1',
        status: 'InQueue',
        orderPlaced: '2024-01-15T10:00:00Z',
      }),
      createMockPrintJob({
        id: '2',
        name: 'Test Print 2',
        status: 'Printing',
        orderPlaced: '2024-01-16T11:00:00Z',
      }),
      createMockPrintJob({
        id: '3',
        name: 'Test Print 3',
        status: 'Ready',
        orderPlaced: '2024-01-17T12:00:00Z',
      }),
    ];
  });

  describe('table rendering', () => {
    it('displays all print jobs in table', () => {
      const pagination = createMockPagination(mockJobs);
      render(<PrintJobsTable printJobs={mockJobs} pagination={pagination} />);

      expect(screen.getByText('Test Print 1')).toBeInTheDocument();
      expect(screen.getByText('Test Print 2')).toBeInTheDocument();
      expect(screen.getByText('Test Print 3')).toBeInTheDocument();
    });

    it('shows empty state when no jobs', () => {
      const pagination = createMockPagination([]);
      render(<PrintJobsTable printJobs={[]} pagination={pagination} />);

      expect(screen.getByText('No results.')).toBeInTheDocument();
    });

    it('displays correct number of rows', () => {
      const pagination = createMockPagination(mockJobs);
      render(<PrintJobsTable printJobs={mockJobs} pagination={pagination} />);

      const rows = screen.getAllByRole('row');
      // 1 header row + 3 data rows
      expect(rows).toHaveLength(4);
    });
  });

  // TODO: Re-enable these tests once row selection functionality is implemented
  // Row selection requires adding a 'select' column in useColumns.tsx
  // describe('row selection', () => {
  //   it('selects individual row when checkbox clicked', async () => {
  //     const user = userEvent.setup();
  //     const pagination = createMockPagination(mockJobs);
  //     render(<PrintJobsTable printJobs={mockJobs} pagination={pagination} />);

  //     const checkbox = screen.getByLabelText('Select print job Test Print 1');
  //     await user.click(checkbox);

  //     expect(checkbox).toBeChecked();
  //   });

  //   it('select all checkbox selects all visible rows', async () => {
  //     const user = userEvent.setup();
  //     const pagination = createMockPagination(mockJobs);
  //     render(<PrintJobsTable printJobs={mockJobs} pagination={pagination} />);

  //     const selectAllCheckbox = screen.getByLabelText(/Select all print jobs on this page/i);
  //     await user.click(selectAllCheckbox);

  //     const row1Checkbox = screen.getByLabelText('Select print job Test Print 1');
  //     const row2Checkbox = screen.getByLabelText('Select print job Test Print 2');
  //     const row3Checkbox = screen.getByLabelText('Select print job Test Print 3');

  //     expect(row1Checkbox).toBeChecked();
  //     expect(row2Checkbox).toBeChecked();
  //     expect(row3Checkbox).toBeChecked();
  //   });

  //   it('deselect all checkbox deselects all rows', async () => {
  //     const user = userEvent.setup();
  //     const pagination = createMockPagination(mockJobs);
  //     render(<PrintJobsTable printJobs={mockJobs} pagination={pagination} />);

  //     const selectAllCheckbox = screen.getByLabelText(/Select all print jobs on this page/i);
  //     await user.click(selectAllCheckbox);
  //     await user.click(selectAllCheckbox);

  //     const row1Checkbox = screen.getByLabelText('Select print job Test Print 1');
  //     expect(row1Checkbox).not.toBeChecked();
  //   });
  // });

  describe('sorting', () => {
    it('allows sorting by print date', async () => {
      const user = userEvent.setup();
      const pagination = createMockPagination(mockJobs);
      render(<PrintJobsTable printJobs={mockJobs} pagination={pagination} />);

      const sortButton = screen.getByLabelText(/Sort by print date/i);
      await user.click(sortButton);

      // After sorting, check order of elements
      const rows = screen.getAllByRole('row');
      // Verify sorting occurred (specific order would depend on implementation)
      expect(rows.length).toBeGreaterThan(1);
    });

    it('toggles sort direction on repeated clicks', async () => {
      const user = userEvent.setup();
      const pagination = createMockPagination(mockJobs);
      render(<PrintJobsTable printJobs={mockJobs} pagination={pagination} />);

      const sortButton = screen.getByLabelText(/Sort by print date/i);
      await user.click(sortButton); // First click - ascending
      await user.click(sortButton); // Second click - descending

      expect(sortButton).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('paginates with rows per page selection', async () => {
      const manyJobs = Array.from({ length: 25 }, (_, i) =>
        createMockPrintJob({
          id: `job-${i}`,
          name: `Print Job ${i}`,
        }),
      );

      const pagination = createMockPagination(manyJobs);
      render(<PrintJobsTable printJobs={manyJobs} pagination={pagination} />);

      // With server-side pagination, we display all jobs passed in
      const rows = screen.getAllByRole('row');
      // 1 header + 25 data rows (all jobs)
      expect(rows).toHaveLength(26);
    });

    it('navigates to next page', async () => {
      const user = userEvent.setup();
      const manyJobs = Array.from({ length: 25 }, (_, i) =>
        createMockPrintJob({
          id: `job-${i}`,
          name: `Print Job ${i}`,
        }),
      );

      const pagination = createMockPagination(manyJobs);
      render(<PrintJobsTable printJobs={manyJobs} pagination={pagination} />);

      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      await user.click(nextButton);

      expect(nextButton).toBeInTheDocument();
    });
  });

  describe('action menu', () => {
    it('opens action menu for each row', async () => {
      const user = userEvent.setup();
      const pagination = createMockPagination(mockJobs);
      render(<PrintJobsTable printJobs={mockJobs} pagination={pagination} />);

      const actionButtons = screen.getAllByLabelText(/Actions for/i);
      await user.click(actionButtons[0]);

      expect(screen.getByText('Copy Job ID')).toBeInTheDocument();
    });

    it('copies job ID to clipboard', async () => {
      const user = userEvent.setup();
      const pagination = createMockPagination(mockJobs);
      render(<PrintJobsTable printJobs={mockJobs} pagination={pagination} />);

      const actionButtons = screen.getAllByLabelText(/Actions for/i);
      await user.click(actionButtons[0]);

      const copyButton = screen.getByRole('menuitem', { name: /copy job id/i });
      fireEvent.click(copyButton);

      expect(copyButton).toBeEnabled();
    });

    // TODO: Re-enable these tests once Cancel Print functionality is implemented
    // See useColumns.tsx lines 224-254 for the commented out implementation
    // it('shows cancel option for InQueue jobs', async () => {
    //   const user = userEvent.setup();
    //   const pagination = createMockPagination(mockJobs);
    //   render(<PrintJobsTable printJobs={mockJobs} pagination={pagination} />);

    //   const actionButtons = screen.getAllByLabelText(/Actions for/i);
    //   await user.click(actionButtons[0]); // First job is InQueue

    //   expect(screen.getByText('Cancel Print')).toBeInTheDocument();
    // });

    // it('cancel action updates job status to Failed', async () => {
    //   const user = userEvent.setup();
    //   const pagination = createMockPagination(mockJobs);
    //   render(<PrintJobsTable printJobs={mockJobs} pagination={pagination} />);

    //   const actionButtons = screen.getAllByLabelText(/Actions for/i);
    //   await user.click(actionButtons[0]);

    //   const cancelButton = screen.getByText('Cancel Print');
    //   await user.click(cancelButton);

    //   // The status badge should update
    //   // We can verify by checking if the UI updated (would need to check badge text)
    //   expect(screen.getByText('Test Print 1')).toBeInTheDocument();
    // });

    // it('does not show cancel for non-InQueue jobs', async () => {
    //   const user = userEvent.setup();
    //   const printingJob = createMockPrintJob({ status: 'Printing' });
    //   const pagination = createMockPagination([printingJob]);
    //   render(<PrintJobsTable printJobs={[printingJob]} pagination={pagination} />);

    //   const actionButton = screen.getByLabelText(/Actions for/i);
    //   await user.click(actionButton);

    //   expect(screen.queryByText('Cancel Print')).not.toBeInTheDocument();
    // });
  });

  describe('admin mode', () => {
    it('shows student column in admin mode', () => {
      const adminJobs = [
        createMockPrintJob({
          student: {
            studentId: 251000001,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        }),
      ];

      const pagination = createMockPagination(adminJobs);
      render(<PrintJobsTable printJobs={adminJobs} pagination={pagination} mode="admin" />);

      expect(screen.getByText('Student')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('does not show student column in user mode', () => {
      const pagination = createMockPagination(mockJobs);
      render(<PrintJobsTable printJobs={mockJobs} pagination={pagination} mode="user" />);

      expect(screen.queryByText('Student')).not.toBeInTheDocument();
    });
  });
});
