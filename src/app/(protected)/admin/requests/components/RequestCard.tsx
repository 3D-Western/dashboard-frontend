import React, { useState } from 'react';
import { PendingRequest } from '@/types/booking';
import { UrgencyBadge } from './UrgencyBadge';

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
    <div className="mb-4 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {request.equipment.name} - {request.userInfo.firstName} {request.userInfo.lastName}
          </h3>
          <p className="text-sm text-muted-foreground">Student ID: {request.userInfo.studentId}</p>
        </div>
        <UrgencyBadge urgency={request.urgencyLevel} />
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
          <div className="col-span-2 font-medium text-destructive">
            ⚠️ Warning: This booking conflicts with existing reservations or capacity limits.
          </div>
        )}
      </div>

      {isRejecting ? (
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
          <input
            type="text"
            placeholder="Reason for rejection..."
            className="flex-1 rounded border border-input bg-background px-3 py-1 text-sm text-foreground"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <button
            onClick={handleRejectSubmit}
            className="rounded bg-destructive px-3 py-1 text-sm text-white hover:bg-destructive/90"
          >
            Confirm Reject
          </button>
          <button
            onClick={() => setIsRejecting(false)}
            className="text-sm text-muted-foreground hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          <button
            onClick={() => setIsRejecting(true)}
            className="rounded border border-destructive px-4 py-2 text-destructive transition-colors hover:bg-destructive/10"
          >
            Reject
          </button>
          <button
            onClick={() => onApprove(request.id)}
            className="rounded bg-status-success px-4 py-2 text-status-success-foreground transition-colors hover:opacity-90"
          >
            Approve
          </button>
        </div>
      )}
    </div>
  );
}
