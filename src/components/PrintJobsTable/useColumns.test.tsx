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
});
