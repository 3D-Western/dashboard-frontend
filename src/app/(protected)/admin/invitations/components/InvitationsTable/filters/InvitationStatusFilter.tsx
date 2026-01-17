'use client';

import { StatusFilter, StatusOption } from '@/components/Filters';
import { InvitationStatus } from '@/types/invitation';

export interface InvitationStatusFilterProps {
  value: InvitationStatus | null;
  onChange: (value: InvitationStatus | null) => void;
  label?: string;
  id?: string;
}

const STATUS_OPTIONS: StatusOption<InvitationStatus>[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REVOKED', label: 'Revoked' },
];

export function InvitationStatusFilter({
  value,
  onChange,
  label = 'Filter by status',
  id = 'invitation-status-filter',
}: InvitationStatusFilterProps) {
  return (
    <StatusFilter
      value={value}
      onChange={onChange}
      options={STATUS_OPTIONS}
      label={label}
      id={id}
      placeholder="Filter by status"
    />
  );
}
