'use client';

import type { Row } from '@tanstack/react-table';
import { AccountStatusBadge } from '@/components/AccountStatusBadge';
import { RowCard, renderCell } from '@/components/ResponsiveTable';
import { AdminUserProfile } from '@/types/user';

/** One user on a phone: name and status, then email and student ID, with the actions menu. */
export function UserCard({ row }: { row: Row<AdminUserProfile> }) {
  const user = row.original;
  return (
    <RowCard
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium break-words">{`${user.firstName} ${user.lastName}`}</span>
          <AccountStatusBadge status={user.accountStatus} />
        </div>
      }
      actions={renderCell(row, 'actions')}
    >
      <p className="break-all">{user.email}</p>
      <p>Student ID: {user.studentId}</p>
      {user.accountStatusReason && <p className="break-words">{user.accountStatusReason}</p>}
    </RowCard>
  );
}
