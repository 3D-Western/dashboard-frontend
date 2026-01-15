'use client';

import { SearchFilter } from '@/components/Filters';
import { StatusFilter } from '@/components/PrintJobsTable/filters';
import { PrintJobStatus } from '@/types/jobs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const ADMIN_STATUS_OPTIONS: PrintJobStatus[] = [
  'DRAFT',
  'IN_QUEUE',
  'PRINTING',
  'READY',
  'FLAGGED',
  'ERROR',
  'CANCELLED',
  'SUCCESS',
  'FAIL',
];

export function AdminPrintFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = (searchParams.get('status') as PrintJobStatus) || null;
  const currentSearch = searchParams.get('search') || '';

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Update or remove parameters
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      // Reset to page 1 when filters change
      params.set('page', '1');

      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleStatusChange = useCallback(
    (status: PrintJobStatus | null) => {
      updateFilters({ status });
    },
    [updateFilters],
  );

  const handleSearchChange = useCallback(
    (search: string) => {
      updateFilters({ search: search || null });
    },
    [updateFilters],
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <StatusFilter
        value={currentStatus}
        onChange={handleStatusChange}
        options={ADMIN_STATUS_OPTIONS}
        label="Filter by status"
      />
      <SearchFilter
        value={currentSearch}
        onChange={handleSearchChange}
        placeholder="Search prints..."
        label="Search print jobs"
      />
    </div>
  );
}
