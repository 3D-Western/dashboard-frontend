'use client';

import { useRouter } from 'next/navigation';
import type { Invitation } from '@/types/invitation';
import type { PaginationMetadata } from '@/types/common';
import { AdminInvitationFilters } from './AdminInvitationFilters';
import InvitationsTable from './InvitationsTable';

interface InvitationsPanelProps {
  invitations: Invitation[];
  pagination: PaginationMetadata;
}

/** The Invitations tab: filters plus the pending / used / expired list with resend and revoke. */
export function InvitationsPanel({ invitations, pagination }: InvitationsPanelProps) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <AdminInvitationFilters />
      <InvitationsTable
        invitations={invitations}
        pagination={pagination}
        // A resent invitation has a new expiry date, so load the list again
        onResendSuccess={() => router.refresh()}
      />
    </div>
  );
}
