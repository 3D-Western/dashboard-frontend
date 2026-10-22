'use client';

import type { Row } from '@tanstack/react-table';
import { CardDateLine, RowCard, renderCell } from '@/components/ResponsiveTable';
import { PrintJobStatusBadge } from '@/components/PrintJobStatusBadge';
import type { PrintJob } from '@/types/jobs';

/** One print job on a phone: name and status, then user and print date, with the actions menu. */
export function PrintJobCard({ row, mode }: { row: Row<PrintJob>; mode: 'user' | 'admin' }) {
  const job = row.original;
  return (
    <RowCard
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium break-words">{job.name}</span>
          <PrintJobStatusBadge status={job.status} />
        </div>
      }
      actions={renderCell(row, 'actions')}
    >
      {mode === 'admin' && (
        <p>
          User: {job.user.firstName} {job.user.lastName}
        </p>
      )}
      <CardDateLine label="Print date" date={job.jobPlaced} />
    </RowCard>
  );
}
