'use client';

import { FilterToolbar, StatusOption } from '@/components/Filters';
import { PrintJobStatus } from '@/types/jobs';

// Admins see the backend's own status names
const ADMIN_STATUS_OPTIONS: StatusOption<PrintJobStatus>[] = [
  { value: 'PendingFile', label: 'Pending File', dotClassName: 'bg-status-gray' },
  { value: 'InQueue', label: 'In Queue', dotClassName: 'bg-status-blue' },
  { value: 'Printing', label: 'Printing', dotClassName: 'bg-status-green' },
  { value: 'Ready', label: 'Ready', dotClassName: 'bg-status-purple' },
  { value: 'Flagged', label: 'Flagged', dotClassName: 'bg-status-red' },
  { value: 'Error', label: 'Error', dotClassName: 'bg-status-red' },
  { value: 'Succeeded', label: 'Succeeded', dotClassName: 'bg-status-purple' },
  { value: 'Failed', label: 'Failed', dotClassName: 'bg-status-red' },
  { value: 'Cancelled', label: 'Cancelled', dotClassName: 'bg-status-gray' },
];

export function AdminJobFilters() {
  return (
    <FilterToolbar
      searchPlaceholder="Search jobs..."
      searchLabel="Search jobs"
      statusOptions={ADMIN_STATUS_OPTIONS}
    />
  );
}
