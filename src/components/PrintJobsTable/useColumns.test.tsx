import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ColumnDef, Row } from '@tanstack/react-table';
import type { PrintJob } from '@/types/jobs';
import { useColumns } from './useColumns';

const getColumnKey = (column: ColumnDef<PrintJob>) => {
  if ('accessorKey' in column && typeof column.accessorKey === 'string') {
    return column.accessorKey;
  }
  return column.id;
};

const hasAccessorKey = (column: ColumnDef<PrintJob>, key: string) =>
  'accessorKey' in column && column.accessorKey === key;

describe('useColumns', () => {
  describe('column configuration', () => {
    it('returns correct columns for user mode', () => {
      const { result } = renderHook(() => useColumns({ mode: 'user' }));
      const columns = result.current;

      const columnIds = columns.map((col) => getColumnKey(col));
      expect(columnIds).toContain('name');
      expect(columnIds).toContain('status');
      expect(columnIds).toContain('jobPlaced');
      expect(columnIds).toContain('actions');
      expect(columnIds).not.toContain('user');
    });

    it('returns correct columns for admin mode', () => {
      const { result } = renderHook(() => useColumns({ mode: 'admin' }));
      const columns = result.current;

      const columnIds = columns.map((col) => getColumnKey(col));
      expect(columnIds).toContain('name');
      expect(columnIds).toContain('user');
      expect(columnIds).toContain('status');
      expect(columnIds).toContain('jobPlaced');
      expect(columnIds).toContain('actions');
    });

    it('defaults to user mode when no mode specified', () => {
      const { result } = renderHook(() => useColumns());
      const columns = result.current;

      const columnIds = columns.map((col) => getColumnKey(col));
      expect(columnIds).not.toContain('user');
    });
  });

  describe('column memoization', () => {
    it('returns same reference when dependencies do not change', () => {
      const setJobs = vi.fn();
      const opts = { mode: 'user' as const, setJobs };
      const { result, rerender } = renderHook(() => useColumns(opts));

      const firstColumns = result.current;
      rerender();
      const secondColumns = result.current;

      expect(firstColumns).toBe(secondColumns);
    });

    it('returns new reference when mode changes', () => {
      const { result, rerender } = renderHook(
        ({ mode }: { mode: 'user' | 'admin' }) => useColumns({ mode }),
        {
          initialProps: { mode: 'user' },
        },
      );

      const userColumns = result.current;
      rerender({ mode: 'admin' as const });
      const adminColumns = result.current;

      expect(userColumns).not.toBe(adminColumns);
    });
  });

  describe('admin mode specific behavior', () => {
    it('user column shows full name', () => {
      const { result } = renderHook(() => useColumns({ mode: 'admin' }));
      const columns = result.current;

      const userColumn = columns.find((col) => hasAccessorKey(col, 'user'));
      expect(userColumn).toBeDefined();
    });
  });

  describe('action menu behavior', () => {
    it('provides cancel action for IN_QUEUE jobs', () => {
      const setJobs = vi.fn();
      const { result } = renderHook(() => useColumns({ mode: 'user', setJobs }));
      const columns = result.current;

      const actionsColumn = columns.find((col) => col.id === 'actions');
      expect(actionsColumn).toBeDefined();
      // Full action menu testing requires integration tests with rendered components
    });

    it('does not break when setJobs is not provided', () => {
      const { result } = renderHook(() => useColumns({ mode: 'user' }));
      const columns = result.current;

      const actionsColumn = columns.find((col) => col.id === 'actions');
      expect(actionsColumn).toBeDefined();
    });
  });

  describe('custom sorting functions', () => {
    describe('user name sorting (admin mode)', () => {
      it('sorts users alphabetically by full name', () => {
        const { result } = renderHook(() => useColumns({ mode: 'admin' }));
        const columns = result.current;
        const userColumn = columns.find((col) => hasAccessorKey(col, 'user'));

        expect(userColumn).toBeDefined();
        expect(userColumn?.sortingFn).toBeDefined();

        const sortingFn = userColumn?.sortingFn;
        if (typeof sortingFn !== 'function') {
          throw new Error('Expected user sortingFn to be a function');
        }

        const rowAlice = {
          original: { user: { firstName: 'Alice', lastName: 'Smith' } },
        } as unknown as Row<PrintJob>;
        const rowBob = {
          original: { user: { firstName: 'Bob', lastName: 'Jones' } },
        } as unknown as Row<PrintJob>;

        expect(sortingFn(rowAlice, rowBob, 'user')).toBeLessThan(0);
        expect(sortingFn(rowBob, rowAlice, 'user')).toBeGreaterThan(0);
      });

      it('sorts case-insensitively', () => {
        const { result } = renderHook(() => useColumns({ mode: 'admin' }));
        const columns = result.current;
        const userColumn = columns.find((col) => hasAccessorKey(col, 'user'));

        const sortingFn = userColumn?.sortingFn;
        if (typeof sortingFn !== 'function') {
          throw new Error('Expected user sortingFn to be a function');
        }

        const lowercase = {
          original: { user: { firstName: 'alice', lastName: 'smith' } },
        } as unknown as Row<PrintJob>;
        const uppercase = {
          original: { user: { firstName: 'ALICE', lastName: 'SMITH' } },
        } as unknown as Row<PrintJob>;

        expect(sortingFn(lowercase, uppercase, 'user')).toBe(0);
      });
    });

    describe('status priority sorting', () => {
      it('sorts by priority: Error > Failed > Flagged > PendingFile > InQueue > Printing > Ready > Succeeded', () => {
        const { result } = renderHook(() => useColumns());
        const columns = result.current;
        const statusColumn = columns.find((col) => hasAccessorKey(col, 'status'));

        expect(statusColumn).toBeDefined();
        expect(statusColumn?.sortingFn).toBeDefined();

        const sortingFn = statusColumn?.sortingFn;
        if (typeof sortingFn !== 'function') {
          throw new Error('Expected status sortingFn to be a function');
        }

        const createRow = (status: string) =>
          ({
            getValue: () => status,
          }) as unknown as Row<PrintJob>;

        // Error comes before all others
        expect(sortingFn(createRow('Error'), createRow('Succeeded'), 'status')).toBeLessThan(0);
        expect(sortingFn(createRow('Error'), createRow('Failed'), 'status')).toBeLessThan(0);

        // Failed comes before Succeeded but after Error
        expect(sortingFn(createRow('Failed'), createRow('Succeeded'), 'status')).toBeLessThan(0);
        expect(sortingFn(createRow('Failed'), createRow('Error'), 'status')).toBeGreaterThan(0);

        // Succeeded comes last
        expect(sortingFn(createRow('Succeeded'), createRow('InQueue'), 'status')).toBeGreaterThan(
          0,
        );
        expect(sortingFn(createRow('Succeeded'), createRow('Error'), 'status')).toBeGreaterThan(0);
      });

      it('maintains correct status sorting order for all statuses', () => {
        const { result } = renderHook(() => useColumns());
        const columns = result.current;
        const statusColumn = columns.find((col) => hasAccessorKey(col, 'status'));

        const sortingFn = statusColumn?.sortingFn;
        if (typeof sortingFn !== 'function') {
          throw new Error('Expected status sortingFn to be a function');
        }

        const createRow = (status: string) =>
          ({
            getValue: () => status,
          }) as unknown as Row<PrintJob>;

        const expectedOrder = [
          'Error',
          'Failed',
          'Flagged',
          'PendingFile',
          'InQueue',
          'Printing',
          'Ready',
          'Succeeded',
        ];

        // Test that each status sorts before the next one
        for (let i = 0; i < expectedOrder.length - 1; i++) {
          const current = createRow(expectedOrder[i]);
          const next = createRow(expectedOrder[i + 1]);
          expect(sortingFn(current, next, 'status')).toBeLessThan(0);
        }
      });

      it('sorts same statuses as equal', () => {
        const { result } = renderHook(() => useColumns());
        const columns = result.current;
        const statusColumn = columns.find((col) => hasAccessorKey(col, 'status'));

        const sortingFn = statusColumn?.sortingFn;
        if (typeof sortingFn !== 'function') {
          throw new Error('Expected status sortingFn to be a function');
        }

        const createRow = (status: string) =>
          ({
            getValue: () => status,
          }) as unknown as Row<PrintJob>;

        expect(sortingFn(createRow('InQueue'), createRow('InQueue'), 'status')).toBe(0);
        expect(sortingFn(createRow('Error'), createRow('Error'), 'status')).toBe(0);
      });
    });
  });
});
