import React from 'react';
import { PendingRequest } from '@/types/booking';
import RequestCard from './RequestCard';

interface RequestQueueProps {
  requests: PendingRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  isLoading?: boolean;
}

export default function RequestQueue({
  requests,
  onApprove,
  onReject,
  isLoading = false,
}: RequestQueueProps) {
  if (isLoading) {
    return <div className="py-8 text-center text-gray-500">Loading pending requests...</div>;
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed bg-gray-50 py-12 text-center text-gray-500">
        <p className="text-lg font-medium">You&apos;re all caught up!</p>
        <p className="text-sm">
          There are no pending requests requiring admin approval at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} onApprove={onApprove} onReject={onReject} />
      ))}
    </div>
  );
}
