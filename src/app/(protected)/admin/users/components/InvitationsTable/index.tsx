'use client';

import { Invitation } from '@/types/invitation';
import { PaginationMetadata } from '@/types/common';
import { useMemo, useState } from 'react';
import { DataTable } from './DataTable';
import { InvitationCard } from './InvitationCard';
import { useColumns } from './useColumns';

interface InvitationsTableProps {
  invitations: Invitation[];
  // Accept either the full PaginationMetadata or a lightweight partial
  // shape (used by some tests) for compatibility.
  pagination: PaginationMetadata | Partial<PaginationMetadata>;
  onRevokeSuccess?: (invitationId: number) => void;
  onResendSuccess?: (invitation: Invitation) => void;
}

export default function InvitationsTable({
  invitations,
  pagination,
  onRevokeSuccess,
  onResendSuccess,
}: InvitationsTableProps) {
  const [revokedInvitationIds, setRevokedInvitationIds] = useState<Set<number>>(new Set());

  const data = useMemo(
    () =>
      invitations.map((invitation) =>
        revokedInvitationIds.has(invitation.id)
          ? { ...invitation, status: 'REVOKED' as const }
          : invitation,
      ),
    [invitations, revokedInvitationIds],
  );

  const handleRevoke = (invitationId: number) => {
    setRevokedInvitationIds((prev) =>
      prev.has(invitationId) ? prev : new Set(prev).add(invitationId),
    );
    onRevokeSuccess?.(invitationId);
  };

  const columns = useColumns({ onRevoke: handleRevoke, onResend: onResendSuccess });

  return (
    <DataTable
      columns={columns}
      data={data}
      pagination={pagination}
      renderCard={(row) => <InvitationCard row={row} />}
    />
  );
}
