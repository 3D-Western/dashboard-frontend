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
import type { IamGroup, IamRole } from '@/types/iam';
import { hasPermission } from '@/types/user';
import type { Column, ColumnDef, Row } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RoleStatusBadge } from '../../RoleStatusBadge';
import { DeactivateGroupDialog } from '../DeactivateGroupDialog';
import { GroupMembersSheet } from '../GroupMembersSheet';
import { GroupRolesSheet } from '../GroupRolesSheet';

interface UseColumnsOptions {
  allRoles: IamRole[];
  onStatusChange: (groupId: number, isActive: boolean) => void;
}

export function useColumns({ allRoles, onStatusChange }: UseColumnsOptions) {
  const user = useUser();
  const canManageGroups = hasPermission(user, PERMISSIONS.IAM_MANAGE_GROUPS);
  const canListUsers = hasPermission(user, PERMISSIONS.USERS_LIST);

  return useMemo<ColumnDef<IamGroup>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }: { column: Column<IamGroup> }) => (
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
        cell: ({ row }: { row: Row<IamGroup> }) => (
          <div className="font-medium">{row.getValue('name')}</div>
        ),
      },
      {
        accessorKey: 'groupKey',
        header: () => <div>Key</div>,
        cell: ({ row }: { row: Row<IamGroup> }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.getValue('groupKey')}</code>
        ),
      },
      {
        accessorKey: 'isActive',
        header: () => <div className="w-full text-center">Status</div>,
        cell: ({ row }: { row: Row<IamGroup> }) => (
          <div className="flex justify-center">
            <RoleStatusBadge isActive={row.getValue('isActive')} isSystem={row.original.isSystem} />
          </div>
        ),
        filterFn: (row, _columnId, filterValue) => row.getValue('isActive') === filterValue,
      },
      {
        accessorKey: 'description',
        header: () => <div>Description</div>,
        cell: ({ row }: { row: Row<IamGroup> }) => (
          <div className="max-w-xs truncate text-muted-foreground">
            {(row.getValue('description') as string | null | undefined) ?? '—'}
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }: { column: Column<IamGroup> }) => (
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
        cell: ({ row }: { row: Row<IamGroup> }) => {
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
        cell: function ActionsCell({ row }: { row: Row<IamGroup> }) {
          const group = row.original;
          const [showRolesSheet, setShowRolesSheet] = useState(false);
          const [showMembersSheet, setShowMembersSheet] = useState(false);
          const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
          const canToggleStatus = canManageGroups && !group.isSystem;

          return (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label={`Actions for group ${group.name}`}
                    aria-haspopup="menu"
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setShowRolesSheet(true)}>
                    View Roles
                  </DropdownMenuItem>
                  {canListUsers && (
                    <DropdownMenuItem onSelect={() => setShowMembersSheet(true)}>
                      Manage Members
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => canToggleStatus && setShowDeactivateDialog(true)}
                    disabled={!canToggleStatus}
                    className={
                      canToggleStatus && group.isActive
                        ? 'text-destructive focus:text-destructive'
                        : ''
                    }
                  >
                    {group.isActive ? 'Deactivate' : 'Reactivate'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <GroupRolesSheet
                group={group}
                allRoles={allRoles}
                open={showRolesSheet}
                onOpenChange={setShowRolesSheet}
              />

              <GroupMembersSheet
                group={group}
                open={showMembersSheet}
                onOpenChange={setShowMembersSheet}
              />

              <DeactivateGroupDialog
                group={group}
                open={showDeactivateDialog}
                onOpenChange={setShowDeactivateDialog}
                onSuccess={(updated) => onStatusChange(updated.id, updated.isActive)}
              />
            </>
          );
        },
      },
    ],
    [canManageGroups, canListUsers, allRoles, onStatusChange],
  );
}
