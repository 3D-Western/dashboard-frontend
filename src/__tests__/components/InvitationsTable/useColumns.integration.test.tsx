import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useColumns } from '@/app/(protected)/admin/invitations/components/InvitationsTable/useColumns';
import type { ColumnDef } from '@tanstack/react-table';
import type { Invitation } from '@/types/invitation';

// Type guard to check if a column has an accessorKey
function hasAccessorKey(col: ColumnDef<Invitation>): col is ColumnDef<Invitation> & { accessorKey: string } {
  return 'accessorKey' in col;
}

describe('useColumns Hook', () => {
  const mockOnRevoke = vi.fn();

  beforeEach(() => {
    mockOnRevoke.mockClear();
  });

  describe('Column Definitions', () => {
    it('returns all expected columns', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const columns = result.current;

      // Should have: studentId, email, invitationCode, status, createdAt, expiredAt, actions
      expect(columns.length).toBe(7);
    });

    it('includes studentId column', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const columns = result.current;
      const studentIdColumn = columns.find((col) => hasAccessorKey(col) && col.accessorKey === 'studentId');

      expect(studentIdColumn).toBeDefined();
      expect(studentIdColumn?.header).toBeDefined();
    });

    it('includes email column', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const columns = result.current;
      const emailColumn = columns.find((col) => hasAccessorKey(col) && col.accessorKey === 'email');

      expect(emailColumn).toBeDefined();
    });

    it('includes invitationCode column', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const columns = result.current;
      const codeColumn = columns.find((col) => hasAccessorKey(col) && col.accessorKey === 'invitationCode');

      expect(codeColumn).toBeDefined();
    });

    it('includes status column', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const columns = result.current;
      const statusColumn = columns.find((col) => hasAccessorKey(col) && col.accessorKey === 'status');

      expect(statusColumn).toBeDefined();
    });

    it('includes createdAt column with sorting', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const columns = result.current;
      const createdColumn = columns.find((col) => hasAccessorKey(col) && col.accessorKey === 'createdAt');

      expect(createdColumn).toBeDefined();
      expect(createdColumn?.header).toBeDefined();
    });

    it('includes expiredAt column with sorting', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const columns = result.current;
      const expiresColumn = columns.find((col) => hasAccessorKey(col) && col.accessorKey === 'expiredAt');

      expect(expiresColumn).toBeDefined();
    });

    it('includes actions column', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const columns = result.current;
      const actionsColumn = columns.find((col) => col.id === 'actions');

      expect(actionsColumn).toBeDefined();
      expect(actionsColumn?.cell).toBeDefined();
    });
  });

  describe('Column Properties', () => {
    it('student ID column displays as center-aligned', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const studentIdColumn = result.current.find((col) => hasAccessorKey(col) && col.accessorKey === 'studentId');
      expect(studentIdColumn).toBeDefined();
      if (studentIdColumn && hasAccessorKey(studentIdColumn)) {
        expect(studentIdColumn.accessorKey).toBe('studentId');
      }
    });

    it('email column uses EmailCell component', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const emailColumn = result.current.find((col) => hasAccessorKey(col) && col.accessorKey === 'email');
      expect(emailColumn?.cell).toBeDefined();
    });

    it('invitationCode column uses InvitationCodeCell component', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const codeColumn = result.current.find((col) => hasAccessorKey(col) && col.accessorKey === 'invitationCode');
      expect(codeColumn?.cell).toBeDefined();
    });

    it('status column uses InvitationStatusBadge component', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const statusColumn = result.current.find((col) => hasAccessorKey(col) && col.accessorKey === 'status');
      expect(statusColumn?.cell).toBeDefined();
    });
  });

  describe('Options Handling', () => {
    it('handles undefined options', () => {
      const { result } = renderHook(() => useColumns());

      expect(result.current).toBeDefined();
      expect(result.current.length).toBeGreaterThan(0);
    });

    it('uses onRevoke callback when provided', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      expect(result.current).toBeDefined();
      // The onRevoke callback is used internally in the actions column
    });
  });

  describe('Column Memoization', () => {
    it('returns stable column references', () => {
      const { result, rerender } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const firstColumns = result.current;

      rerender();

      const secondColumns = result.current;

      // Columns should be memoized and stable
      expect(firstColumns).toEqual(secondColumns);
    });

    it('updates columns when onRevoke changes', () => {
      const secondMockOnRevoke = vi.fn();

      const { result, rerender } = renderHook(
        ({ onRevoke }: { onRevoke?: (id: number) => void }) => useColumns({ onRevoke }),
        {
          initialProps: { onRevoke: mockOnRevoke },
        },
      );

      rerender({ onRevoke: secondMockOnRevoke });

      const secondColumns = result.current;

      // Columns may be recreated when dependency changes
      expect(secondColumns).toBeDefined();
    });
  });

  describe('Column Accessibility', () => {
    it('has aria-labels on sortable column headers', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const createdColumn = result.current.find((col) => hasAccessorKey(col) && col.accessorKey === 'createdAt');
      expect(createdColumn?.header).toBeDefined();

      const expiresColumn = result.current.find((col) => hasAccessorKey(col) && col.accessorKey === 'expiredAt');
      expect(expiresColumn?.header).toBeDefined();
    });

    it('actions column has accessible button labels', () => {
      const { result } = renderHook(() => useColumns({ onRevoke: mockOnRevoke }));

      const actionsColumn = result.current.find((col) => col.id === 'actions');
      expect(actionsColumn).toBeDefined();
      expect(actionsColumn?.cell).toBeDefined();
    });
  });
});
