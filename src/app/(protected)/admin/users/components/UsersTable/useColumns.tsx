'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PERMISSIONS } from '@/constants/permissions';
import { useUser } from '@/providers/user-provider';
import { AdminUserProfile, hasPermission } from '@/types/user';
import type { Column, ColumnDef, Row } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AccountStatusBadge } from '@/components/AccountStatusBadge';
import { ChangeAccountStatusDialog } from './ChangeAccountStatusDialog';

interface UseColumnsOptions {
  onStatusChanged?: (studentId: number, updated: AdminUserProfile) => void;
}

export const useColumns = (opts: UseColumnsOptions = {}) => {
  const { onStatusChanged } = opts;
  const user = useUser();
  const canChangeStatus = hasPermission(user, PERMISSIONS.USERS_UPDATE_STATUS);

  return useMemo<ColumnDef<AdminUserProfile>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        header: ({ column }: { column: Column<AdminUserProfile> }) => {
          const sortDirection = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              aria-label={`Sort by name ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          );
        },
        cell: ({ row }: { row: Row<AdminUserProfile> }) => (
          <div className="font-medium">{row.getValue('name') as string}</div>
        ),
      },
      {
        accessorKey: 'email',
        header: () => <div className="w-full text-left">Email</div>,
        cell: ({ row }: { row: Row<AdminUserProfile> }) => row.getValue('email') as string,
      },
      {
        accessorKey: 'studentId',
        header: () => <div className="w-full text-center">Student ID</div>,
        cell: ({ row }: { row: Row<AdminUserProfile> }) => (
          <div className="w-full text-center">{row.getValue('studentId') as number}</div>
        ),
      },
      {
        accessorKey: 'accountStatus',
        header: () => <div className="w-full text-center">Account Status</div>,
        cell: ({ row }: { row: Row<AdminUserProfile> }) => {
          const adminUser = row.original;
          return (
            <div className="flex w-full flex-col items-center gap-1">
              <AccountStatusBadge status={adminUser.accountStatus} />
              {adminUser.accountStatusReason && (
                <span className="text-muted-foreground max-w-48 truncate text-xs" title={adminUser.accountStatusReason}>
                  {adminUser.accountStatusReason}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        cell: function ActionsCell({ row }: { row: Row<AdminUserProfile> }) {
          const adminUser = row.original;
          const [showChangeStatusDialog, setShowChangeStatusDialog] = useState(false);
          const fullName = `${adminUser.firstName} ${adminUser.lastName}`;

          return (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label={`Actions for ${fullName}`}
                    aria-haspopup="menu"
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={async () => {
                      try {
                        await navigator.clipboard.writeText(adminUser.studentId.toString());
                      } catch (error) {
                        console.error('Failed to copy Student ID to clipboard', error);
                      }
                    }}
                  >
                    Copy Student ID
                  </DropdownMenuItem>
                  {canChangeStatus && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => setShowChangeStatusDialog(true)}>
                        Change Account Status
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {canChangeStatus && (
                <ChangeAccountStatusDialog
                  user={adminUser}
                  open={showChangeStatusDialog}
                  onOpenChange={setShowChangeStatusDialog}
                  onStatusChanged={onStatusChanged}
                />
              )}
            </>
          );
        },
      },
    ],
    [canChangeStatus, onStatusChanged],
  );
};
