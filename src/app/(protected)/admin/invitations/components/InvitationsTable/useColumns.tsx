'use client';

import { invitationApi } from '@/api/client/invitation';
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
import type { Invitation } from '@/types/invitation';
import { InvitationStatus } from '@/types/invitation';
import { hasPermission } from '@/types/user';
import type { Column, ColumnDef, Row } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DateCell } from './DateCell';
import { EmailCell } from './EmailCell';
import { InvitationCodeCell } from './InvitationCodeCell';
import { InvitationInfoDialog } from './InvitationInfoDialog';
import { InvitationStatusBadge } from './InvitationStatusBadge';
import { RevokeInvitationDialog } from './RevokeInvitationDialog';

interface UseColumnsOptions {
  onRevoke?: (invitationId: number) => void;
}

export const useColumns = (opts: UseColumnsOptions = {}) => {
  const { onRevoke } = opts;
  const user = useUser();
  const canUserRevoke = hasPermission(user, PERMISSIONS.INVITATIONS_REVOKE);
  const canUserViewInfo = hasPermission(user, PERMISSIONS.INVITATIONS_READ);

  return useMemo<ColumnDef<Invitation>[]>(
    () => [
      {
        accessorKey: 'studentId',
        header: () => <div className="w-full text-center">Student ID</div>,
        cell: ({ row }: { row: Row<Invitation> }) => {
          const studentId = row.getValue('studentId') as number;
          return <div className="w-full text-center font-medium">{studentId}</div>;
        },
      },
      {
        accessorKey: 'email',
        header: () => <div className="w-full text-center">Email</div>,
        cell: ({ row }: { row: Row<Invitation> }) => {
          const email = row.getValue('email') as string;
          return <EmailCell email={email} />;
        },
      },
      {
        accessorKey: 'invitationCode',
        header: () => <div className="w-full text-center">Invitation Code</div>,
        cell: ({ row }: { row: Row<Invitation> }) => {
          const code = row.getValue('invitationCode') as string;
          return <InvitationCodeCell code={code} />;
        },
      },
      {
        accessorKey: 'status',
        header: () => <div className="w-full text-center">Status</div>,
        cell: ({ row }: { row: Row<Invitation> }) => {
          const status = row.getValue('status') as InvitationStatus;
          return (
            <div className="flex w-full justify-center">
              <InvitationStatusBadge status={status} />
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }: { column: Column<Invitation> }) => {
          const sortDirection = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              aria-label={`Sort by created date ${
                sortDirection === 'asc'
                  ? 'descending'
                  : sortDirection === 'desc'
                    ? 'ascending'
                    : 'ascending'
              }`}
            >
              Created
              <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          );
        },
        cell: ({ row }: { row: Row<Invitation> }) => (
          <DateCell date={row.getValue('createdAt') as string} />
        ),
      },
      {
        accessorKey: 'expiredAt',
        header: ({ column }: { column: Column<Invitation> }) => {
          const sortDirection = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              aria-label={`Sort by expiry date ${
                sortDirection === 'asc'
                  ? 'descending'
                  : sortDirection === 'desc'
                    ? 'ascending'
                    : 'ascending'
              }`}
            >
              Expires
              <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          );
        },
        cell: ({ row }: { row: Row<Invitation> }) => (
          <DateCell date={row.getValue('expiredAt') as string} />
        ),
      },
      {
        id: 'actions',
        cell: function ActionsCell({ row }: { row: Row<Invitation> }) {
          const invitation = row.original;
          const canRevoke = canUserRevoke && invitation.status === 'PENDING';
          const [showRevokeDialog, setShowRevokeDialog] = useState(false);
          const [showInfoDialog, setShowInfoDialog] = useState(false);
          const [isRevoking, setIsRevoking] = useState(false);

          const handleRevoke = async () => {
            setIsRevoking(true);
            try {
              await invitationApi.revokeInvitation(invitation.id);
              onRevoke?.(invitation.id);
              setShowRevokeDialog(false);
              toast.success('Invitation revoked successfully.');
            } catch (error) {
              toast.error('Failed to revoke invitation. Please try again.');
              console.error('Failed to revoke invitation:', error);
            } finally {
              setIsRevoking(false);
            }
          };

          return (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label={`Actions for invitation to ${invitation.email}`}
                    aria-haspopup="menu"
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => canUserViewInfo && setShowInfoDialog(true)}
                    disabled={!canUserViewInfo}
                  >
                    More Info
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => canRevoke && setShowRevokeDialog(true)}
                    disabled={!canRevoke}
                    className={canRevoke ? 'text-destructive focus:text-destructive' : ''}
                  >
                    Revoke Invitation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <RevokeInvitationDialog
                open={showRevokeDialog}
                onOpenChange={setShowRevokeDialog}
                email={invitation.email}
                onConfirm={handleRevoke}
                isLoading={isRevoking}
              />

              <InvitationInfoDialog
                open={showInfoDialog}
                onOpenChange={setShowInfoDialog}
                invitation={invitation}
              />
            </>
          );
        },
      },
    ],
    [canUserRevoke, canUserViewInfo, onRevoke],
  );
};
