'use client';

import { FilterToolbar, StatusOption } from '@/components/Filters';
import { InvitationStatus } from '@/types/invitation';

const INVITATION_STATUS_OPTIONS: StatusOption<InvitationStatus>[] = [
  { value: 'PENDING', label: 'Pending', dotClassName: 'bg-status-blue' },
  { value: 'ACCEPTED', label: 'Used', dotClassName: 'bg-status-purple' },
  { value: 'EXPIRED', label: 'Expired', dotClassName: 'bg-status-red' },
  { value: 'REVOKED', label: 'Revoked', dotClassName: 'bg-status-red' },
];

export function AdminInvitationFilters() {
  return (
    <FilterToolbar
      searchParam="email"
      searchPlaceholder="Search by email..."
      searchLabel="Search invitations by email"
      statusOptions={INVITATION_STATUS_OPTIONS}
    />
  );
}
