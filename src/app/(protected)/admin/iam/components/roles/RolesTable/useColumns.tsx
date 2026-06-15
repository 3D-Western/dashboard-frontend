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
import type { IamRole } from '@/types/iam';
import { hasPermission } from '@/types/user';
import type { Column, ColumnDef, Row } from '@tanstack/react-table';
import { ArrowUpDown, LockKeyhole, MoreHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RoleStatusBadge } from '../../RoleStatusBadge';
import { DeactivateRoleDialog } from '../DeactivateRoleDialog';
import { RolePermissionsSheet } from '../RolePermissionsSheet';

interface UseColumnsOptions {
  onStatusChange: (roleId: number, isActive: boolean) => void;
}

export function useColumns({ onStatusChange }: UseColumnsOptions) {
  const user = useUser();
  const canAssignRoles = hasPermission(user, PERMISSIONS.IAM_ASSIGN_ROLES);

  return useMemo<ColumnDef<IamRole>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }: { column: Column<IamRole> }) => (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Sort by name ${column.getIsSorted() === 'asc' ? 'descending' : 'ascending'}`}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        ),
        cell: ({ row }: { row: Row<IamRole> }) => (
          <div className="flex flex-row items-center font-medium">
            <div>{row.getValue('name')}</div>
            {row.original.isSystem && (
              <LockKeyhole className="ml-2 h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ),
      },
      {
        accessorKey: 'roleKey',
        header: () => <div>Key</div>,
        cell: ({ row }: { row: Row<IamRole> }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.getValue('roleKey')}</code>
        ),
      },
      {
        accessorKey: 'isActive',
        header: () => <div className="w-full text-center">Status</div>,
        cell: ({ row }: { row: Row<IamRole> }) => (
          <div className="flex justify-center">
            <RoleStatusBadge isActive={row.getValue('isActive')} />
          </div>
        ),
        filterFn: (row, _columnId, filterValue) => row.getValue('isActive') === filterValue,
      },
      {
        accessorKey: 'description',
        header: () => <div>Description</div>,
        cell: ({ row }: { row: Row<IamRole> }) => (
          <div className="max-w-xs truncate text-muted-foreground">
            {(row.getValue('description') as string | null | undefined) ?? '—'}
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }: { column: Column<IamRole> }) => (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Sort by created date ${column.getIsSorted() === 'asc' ? 'descending' : 'ascending'}`}
          >
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        ),
        cell: ({ row }: { row: Row<IamRole> }) => {
          const date = new Date(row.getValue('createdAt') as string);
          return (
            <div className="w-full text-center text-sm text-muted-foreground">
              {date.toLocaleDateString()}
            </div>
          );
        },
      },
      {
        id: 'actions',
        cell: function ActionsCell({ row }: { row: Row<IamRole> }) {
          const role = row.original;
          const [showSheet, setShowSheet] = useState(false);
          const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
          const canToggleStatus = canAssignRoles && !role.isSystem;

          return (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label={`Actions for role ${role.name}`}
                    aria-haspopup="menu"
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setShowSheet(true)}>
                    View Permissions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => canToggleStatus && setShowDeactivateDialog(true)}
                    disabled={!canToggleStatus}
                    className={
                      canToggleStatus && role.isActive
                        ? 'text-destructive focus:text-destructive'
                        : ''
                    }
                  >
                    {role.isActive ? 'Deactivate' : 'Reactivate'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <RolePermissionsSheet role={role} open={showSheet} onOpenChange={setShowSheet} />

              <DeactivateRoleDialog
                role={role}
                open={showDeactivateDialog}
                onOpenChange={setShowDeactivateDialog}
                onSuccess={(updatedRole) => onStatusChange(updatedRole.id, updatedRole.isActive)}
              />
            </>
          );
        },
      },
    ],
    [canAssignRoles, onStatusChange],
  );
}
