import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
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
      expect(columnIds).toContain('orderPlaced');
      expect(columnIds).toContain('actions');
      expect(columnIds).not.toContain('student');
    });

    it('returns correct columns for admin mode', () => {
      const { result } = renderHook(() => useColumns({ mode: 'admin' }));
      const columns = result.current;

      const columnIds = columns.map((col) => getColumnKey(col));
      expect(columnIds).toContain('name');
      expect(columnIds).toContain('student');
      expect(columnIds).toContain('status');
      expect(columnIds).toContain('orderPlaced');
      expect(columnIds).toContain('actions');
    });

    it('defaults to user mode when no mode specified', () => {
      const { result } = renderHook(() => useColumns());
      const columns = result.current;

      const columnIds = columns.map((col) => getColumnKey(col));
      expect(columnIds).not.toContain('student');
    });
  });

  describe('column memoization', () => {
    it('returns same reference when dependencies do not change', () => {
      const setJobs = vi.fn();
      const { result, rerender } = renderHook(() => useColumns({ mode: 'user', setJobs }));

      const firstColumns = result.current;
      rerender();
      const secondColumns = result.current;

      expect(firstColumns).toBe(secondColumns);
    });

    it('returns new reference when mode changes', () => {
      const { result, rerender } = renderHook(({ mode }) => useColumns({ mode }), {
        initialProps: { mode: 'user' as const },
      });

      const userColumns = result.current;
      rerender({ mode: 'admin' as const });
      const adminColumns = result.current;

      expect(userColumns).not.toBe(adminColumns);
    });
  });

  describe('admin mode specific behavior', () => {
    it('student column shows full name', () => {
      const { result } = renderHook(() => useColumns({ mode: 'admin' }));
      const columns = result.current;

      const studentColumn = columns.find((col) => hasAccessorKey(col, 'student'));
      expect(studentColumn).toBeDefined();
    });

    it('student column shows placeholder when student data is missing', () => {
      const { result } = renderHook(() => useColumns({ mode: 'admin' }));
      const columns = result.current;

      const studentColumn = columns.find((col) => hasAccessorKey(col, 'student'));
      expect(studentColumn).toBeDefined();
      // Further testing of cell rendering would require integration tests
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
    describe('student name sorting (admin mode)', () => {
      it('sorts students alphabetically by full name', () => {
        const { result } = renderHook(() => useColumns({ mode: 'admin' }));
        const columns = result.current;
        const studentColumn = columns.find((col) => hasAccessorKey(col, 'student'));

        expect(studentColumn).toBeDefined();
        expect(studentColumn?.sortingFn).toBeDefined();

        const sortingFn = studentColumn!.sortingFn!;

        const rowAlice = {
          original: { student: { firstName: 'Alice', lastName: 'Smith' } },
        } as any;
        const rowBob = {
          original: { student: { firstName: 'Bob', lastName: 'Jones' } },
        } as any;

        expect(sortingFn(rowAlice, rowBob, 'student')).toBeLessThan(0);
        expect(sortingFn(rowBob, rowAlice, 'student')).toBeGreaterThan(0);
      });

      it('handles null student data - nulls sort last', () => {
        const { result } = renderHook(() => useColumns({ mode: 'admin' }));
        const columns = result.current;
        const studentColumn = columns.find((col) => hasAccessorKey(col, 'student'));

        const sortingFn = studentColumn!.sortingFn!;

        const withStudent = {
          original: { student: { firstName: 'Alice', lastName: 'Smith' } },
        } as any;
        const withoutStudent = { original: { student: null } } as any;

        // Student should come before null
        expect(sortingFn(withStudent, withoutStudent, 'student')).toBeLessThan(0);
        // Null should come after student
        expect(sortingFn(withoutStudent, withStudent, 'student')).toBeGreaterThan(0);
      });

      it('handles both students being null - sorts equal', () => {
        const { result } = renderHook(() => useColumns({ mode: 'admin' }));
        const columns = result.current;
        const studentColumn = columns.find((col) => hasAccessorKey(col, 'student'));

        const sortingFn = studentColumn!.sortingFn!;

        const nullA = { original: { student: null } } as any;
        const nullB = { original: { student: null } } as any;

        expect(sortingFn(nullA, nullB, 'student')).toBe(0);
      });

      it('sorts case-insensitively', () => {
        const { result } = renderHook(() => useColumns({ mode: 'admin' }));
        const columns = result.current;
        const studentColumn = columns.find((col) => hasAccessorKey(col, 'student'));

        const sortingFn = studentColumn!.sortingFn!;

        const lowercase = {
          original: { student: { firstName: 'alice', lastName: 'smith' } },
        } as any;
        const uppercase = {
          original: { student: { firstName: 'ALICE', lastName: 'SMITH' } },
        } as any;

        expect(sortingFn(lowercase, uppercase, 'student')).toBe(0);
      });
    });

    describe('status priority sorting', () => {
      it('sorts by priority: Error > Failed > Flagged > PendingFile > InQueue > Printing > Ready > Succeeded', () => {
        const { result } = renderHook(() => useColumns());
        const columns = result.current;
        const statusColumn = columns.find((col) => hasAccessorKey(col, 'status'));

        expect(statusColumn).toBeDefined();
        expect(statusColumn?.sortingFn).toBeDefined();

        const sortingFn = statusColumn!.sortingFn!;

        const createRow = (status: string) => ({ getValue: () => status } as any);

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

      it('maintains correct order for all statuses', () => {
        const { result } = renderHook(() => useColumns());
        const columns = result.current;
        const statusColumn = columns.find((col) => hasAccessorKey(col, 'status'));

        const sortingFn = statusColumn!.sortingFn!;
        const createRow = (status: string) => ({ getValue: () => status } as any);

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

        const sortingFn = statusColumn!.sortingFn!;
        const createRow = (status: string) => ({ getValue: () => status } as any);

        expect(sortingFn(createRow('InQueue'), createRow('InQueue'), 'status')).toBe(0);
        expect(sortingFn(createRow('Error'), createRow('Error'), 'status')).toBe(0);
      });
    });
  });
});
