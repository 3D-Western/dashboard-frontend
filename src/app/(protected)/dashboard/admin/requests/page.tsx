'use client';

import React from 'react';
import RequestQueue from '@/components/Booking/Admin/RequestQueue';
import { usePendingRequests, useApproveBooking, useRejectBooking } from '@/hooks/useAdminBookings';

export default function AdminRequestsPage() {
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
    return <div className="p-6 text-red-600">Error loading requests: {fetchError}</div>;
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Pending Requests Queue</h1>
        <p className="text-gray-600">
          Review and manage equipment booking requests requiring administrative approval.
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
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
