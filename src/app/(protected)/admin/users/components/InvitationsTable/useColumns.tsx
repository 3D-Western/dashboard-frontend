'use client';

import { ApiError } from '@/api/client/errors';
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
import { memberTypeLabel, type Invitation } from '@/types/invitation';
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
  /** Called after an invitation was sent again, so the list can refresh (its dates changed). */
  onResend?: (invitation: Invitation) => void;
}

export const useColumns = (opts: UseColumnsOptions = {}) => {
  const { onRevoke, onResend } = opts;
  const user = useUser();
  const canUserRevoke = hasPermission(user, PERMISSIONS.INVITATIONS_REVOKE);
  const canUserViewInfo = hasPermission(user, PERMISSIONS.INVITATIONS_READ);
  // Sending again uses the same permission as creating an invitation
  const canUserResend = hasPermission(user, PERMISSIONS.INVITATIONS_CREATE);

  return useMemo<ColumnDef<Invitation>[]>(
    () => [
      {
        id: 'name',
        header: () => <div className="w-full text-center">Name</div>,
        cell: ({ row }: { row: Row<Invitation> }) => {
          const { firstName, lastName, memberType } = row.original;
          const name = [firstName, lastName].filter(Boolean).join(' ');
          return (
            <div className="w-full text-center">
              <div className="font-medium">{name || '-'}</div>
              <div className="text-xs text-muted-foreground">{memberTypeLabel(memberType)}</div>
            </div>
          );
        },
      },
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
          const canResend =
            canUserResend && (invitation.status === 'PENDING' || invitation.status === 'EXPIRED');
          const [showRevokeDialog, setShowRevokeDialog] = useState(false);
          const [showInfoDialog, setShowInfoDialog] = useState(false);
          const [isRevoking, setIsRevoking] = useState(false);
          const [isResending, setIsResending] = useState(false);

          const handleResend = async () => {
            setIsResending(true);
            try {
              const updated = await invitationApi.resendInvitation(invitation.id);
              onResend?.(updated);
              toast.success(`Invitation sent again to ${invitation.email}.`);
            } catch (error) {
              toast.error(
                error instanceof ApiError && error.message
                  ? error.message
                  : 'Failed to resend the invitation. Please try again.',
              );
              console.error('Failed to resend invitation:', error);
            } finally {
              setIsResending(false);
            }
          };

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
                    className="h-11 w-11 p-0 fine:h-8 fine:w-8"
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
                  <DropdownMenuItem
                    onSelect={() => canResend && handleResend()}
                    disabled={!canResend || isResending}
                  >
                    Resend invitation
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
    [canUserRevoke, canUserViewInfo, canUserResend, onRevoke, onResend],
  );
};
