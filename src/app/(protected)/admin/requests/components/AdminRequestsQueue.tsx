'use client';

import React from 'react';
import RequestQueue from './RequestQueue';
import { usePendingRequests, useApproveBooking, useRejectBooking } from '@/hooks/useAdminBookings';

export function AdminRequestsQueue() {
  const { requests: pendingRequests, error: fetchError, refetch } = usePendingRequests();

  const { approve } = useApproveBooking();
  const { reject } = useRejectBooking();

  const handleApprove = async (id: string) => {
    await approve(id);
    refetch();
  };

  const handleReject = async (id: string, reason: string) => {
    await reject(id, reason);
    refetch();
  };

  if (fetchError) {
    return <div className="p-6 text-destructive">Error loading requests: {fetchError}</div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-lg bg-card p-6 text-card-foreground shadow">
        <RequestQueue
          requests={pendingRequests}
          isLoading={!pendingRequests && !fetchError}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </div>
  );
}
