'use client';

import { SearchFilter } from '@/components/Filters';
import { InvitationStatusFilter } from './InvitationsTable/filters';
import { InvitationStatus } from '@/types/invitation';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function AdminInvitationFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = (searchParams.get('status') as InvitationStatus) || null;
  const currentEmail = searchParams.get('email') || '';

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

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
    (status: InvitationStatus | null) => {
      updateFilters({ status });
    },
    [updateFilters],
  );

  const handleEmailChange = useCallback(
    (email: string) => {
      updateFilters({ email: email || null });
    },
    [updateFilters],
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <InvitationStatusFilter
        value={currentStatus}
        onChange={handleStatusChange}
        label="Filter by status"
      />
      <SearchFilter
        value={currentEmail}
        onChange={handleEmailChange}
        placeholder="Search by email..."
        label="Search invitations by email"
      />
    </div>
  );
}
