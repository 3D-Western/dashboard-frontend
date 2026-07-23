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
    <div className="border rounded-lg p-4 mb-4 shadow-sm bg-white">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-semibold">
            {request.equipment.name} - {request.userInfo.firstName} {request.userInfo.lastName}
          </h3>
          <p className="text-sm text-gray-500">Student ID: {request.userInfo.studentId}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
          request.urgencyLevel === 'High' ? 'bg-red-100 text-red-800' : 
          request.urgencyLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {request.urgencyLevel} Urgency
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
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
          <div className="col-span-2 text-red-600 font-medium">
            ⚠️ Warning: This booking conflicts with existing reservations or capacity limits.
          </div>
        )}
      </div>

      {isRejecting ? (
        <div className="flex gap-2 items-center mt-4 border-t pt-4">
          <input 
            type="text" 
            placeholder="Reason for rejection..." 
            className="border rounded px-3 py-1 text-sm flex-1"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <button onClick={handleRejectSubmit} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">Confirm Reject</button>
          <button onClick={() => setIsRejecting(false)} className="text-gray-600 text-sm hover:underline">Cancel</button>
        </div>
      ) : (
        <div className="flex gap-2 mt-4 border-t pt-4 justify-end">
          <button 
            onClick={() => setIsRejecting(true)} 
            className="border border-red-600 text-red-600 px-4 py-2 rounded hover:bg-red-50 transition-colors"
          >
            Reject
          </button>
          <button 
            onClick={() => onApprove(request.id)} 
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            Approve
          </button>
        </div>
      )}
    </div>
  );
}