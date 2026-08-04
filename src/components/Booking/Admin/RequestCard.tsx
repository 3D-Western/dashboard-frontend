import React, { useState } from 'react';
import { PendingRequest } from '@/types/booking';

interface RequestCardProps {
  request: PendingRequest;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

export default function RequestCard({ request, onApprove, onReject }: RequestCardProps) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) return;
    onReject(request.id, rejectReason);
    setIsRejecting(false);
  };

  return (
    <div className="mb-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {request.equipment.name} - {request.userInfo.firstName} {request.userInfo.lastName}
          </h3>
          <p className="text-sm text-gray-500">Student ID: {request.userInfo.studentId}</p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-bold ${
            request.urgencyLevel === 'High'
              ? 'bg-red-100 text-red-800'
              : request.urgencyLevel === 'Medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-blue-100 text-blue-800'
          }`}
        >
          {request.urgencyLevel} Urgency
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium">Start:</span> {new Date(request.startTime).toLocaleString()}
        </div>
        <div>
          <span className="font-medium">End:</span> {new Date(request.endTime).toLocaleString()}
        </div>
        <div className="col-span-2">
          <span className="font-medium">Purpose:</span> {request.purpose}
        </div>
        {request.hasConflict && (
          <div className="col-span-2 font-medium text-red-600">
            ⚠️ Warning: This booking conflicts with existing reservations or capacity limits.
          </div>
        )}
      </div>

      {isRejecting ? (
        <div className="mt-4 flex items-center gap-2 border-t pt-4">
          <input
            type="text"
            placeholder="Reason for rejection..."
            className="flex-1 rounded border px-3 py-1 text-sm"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <button
            onClick={handleRejectSubmit}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
          >
            Confirm Reject
          </button>
          <button
            onClick={() => setIsRejecting(false)}
            className="text-sm text-gray-600 hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-4 flex justify-end gap-2 border-t pt-4">
          <button
            onClick={() => setIsRejecting(true)}
            className="rounded border border-red-600 px-4 py-2 text-red-600 transition-colors hover:bg-red-50"
          >
            Reject
          </button>
          <button
            onClick={() => onApprove(request.id)}
            className="rounded bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
          >
            Approve
          </button>
        </div>
      )}
    </div>
  );
}
