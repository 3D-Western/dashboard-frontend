'use client';

import { AdminUserProfile } from '@/types/user';
import { PaginationMetadata } from '@/types/common';
import { useCallback, useMemo, useState } from 'react';
import { DataTable } from './DataTable';
import { useColumns } from './useColumns';

export interface UsersTableProps {
  users: AdminUserProfile[];
  pagination: PaginationMetadata;
}

export default function UsersTable({ users, pagination }: UsersTableProps) {
  const [overrides, setOverrides] = useState<Record<number, AdminUserProfile>>({});

  const rows = useMemo(
    () => users.map((user) => overrides[user.studentId] ?? user),
    [users, overrides],
  );

  const handleStatusChanged = useCallback((studentId: number, updated: AdminUserProfile) => {
    setOverrides((prev) => ({ ...prev, [studentId]: updated }));
  }, []);

  const columns = useColumns({ onStatusChanged: handleStatusChanged });

  return <DataTable columns={columns} data={rows} pagination={pagination} />;
}
