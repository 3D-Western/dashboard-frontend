'use client';

import { Invitation } from '@/types/invitation';
import { PaginationMetadata } from '@/types/common';
import { useMemo, useState } from 'react';
import { DataTable } from './DataTable';
import { useColumns } from './useColumns';

interface InvitationsTableProps {
  invitations: Invitation[];
  // Accept either the full PaginationMetadata or a lightweight partial
  // shape (used by some tests) for compatibility.
  pagination: PaginationMetadata | Partial<PaginationMetadata>;
  onRevokeSuccess?: (invitationId: number) => void;
}

export default function InvitationsTable({
  invitations,
  pagination,
  onRevokeSuccess,
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

  const columns = useColumns({ onRevoke: handleRevoke });

  return <DataTable columns={columns} data={data} pagination={pagination} />;
}
