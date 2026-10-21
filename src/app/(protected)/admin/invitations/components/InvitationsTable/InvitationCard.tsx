'use client';

import type { Row } from '@tanstack/react-table';
import { CardDateLine, RowCard, renderCell } from '@/components/ResponsiveTable';
import type { Invitation } from '@/types/invitation';
import { EmailCell } from './EmailCell';
import { InvitationCodeCell } from './InvitationCodeCell';
import { InvitationStatusBadge } from './InvitationStatusBadge';

/** One invitation on a phone: email, student ID and status, the code and dates, then the actions. */
export function InvitationCard({ row }: { row: Row<Invitation> }) {
  const invitation = row.original;
  return (
    <RowCard title={<EmailCell email={invitation.email} />} actions={renderCell(row, 'actions')}>
      <div className="flex flex-wrap items-center gap-2">
        <span>Student ID: {invitation.studentId}</span>
        <InvitationStatusBadge status={invitation.status} />
      </div>
      <InvitationCodeCell code={invitation.invitationCode} />
      <CardDateLine label="Created" date={invitation.createdAt} />
      <CardDateLine label="Expires" date={invitation.expiredAt} />
    </RowCard>
  );
}
