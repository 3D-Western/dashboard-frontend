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
  const [revokedInvitationIds, setRevokedInvitationIds] = useState<number[]>([]);

  const data = useMemo(
    () =>
      invitations.map((invitation) =>
        revokedInvitationIds.includes(invitation.id)
          ? { ...invitation, status: 'REVOKED' as const }
          : invitation,
      ),
    [invitations, revokedInvitationIds],
  );

  const handleRevoke = (invitationId: number) => {
    setRevokedInvitationIds((prev) =>
      prev.includes(invitationId) ? prev : [...prev, invitationId],
    );
    onRevokeSuccess?.(invitationId);
  };

  const columns = useColumns({ onRevoke: handleRevoke });

  return <DataTable columns={columns} data={data} pagination={pagination} />;
}
