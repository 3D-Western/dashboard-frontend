'use client';

import { Invitation } from '@/types/invitation';
import { PaginationMetadata } from '@/types/common';
import { useEffect, useState } from 'react';
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
  const [data, setData] = useState<Invitation[]>(invitations);

  useEffect(() => {
    setData(invitations);
  }, [invitations]);

  const handleRevoke = (invitationId: number) => {
    // Update local state to reflect the revoked invitation
    setData((prev) =>
      prev.map((inv) => (inv.id === invitationId ? { ...inv, status: 'REVOKED' as const } : inv)),
    );
    onRevokeSuccess?.(invitationId);
  };

  const columns = useColumns({ onRevoke: handleRevoke });

  return <DataTable columns={columns} data={data} pagination={pagination} />;
}
