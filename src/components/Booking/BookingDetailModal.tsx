'use client';

import { ShieldAlert, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Booking, ConflictResponse } from '@/types/booking';
import { Button } from '@/components/ui/button';
import { useApproveBooking, useRejectBooking } from '@/hooks/useAdminBookings';
import { useUser } from '@/providers/user-provider';

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  conflictData?: ConflictResponse;
}

export default function BookingDetailModal({ isOpen, onClose, booking, conflictData }: BookingDetailModalProps) {
  const user = useUser();
  const { approve, isPending: isApproving } = useApproveBooking();
  const { reject, isPending: isRejecting } = useRejectBooking();

  if (!isOpen || !booking) return null;

  const rawUser = user as any;
  const isAdmin = rawUser.role === 'ADMIN' || rawUser.role === 'SUPER_ADMIN';

  const rawBooking = booking as any;
  const fallbackId = rawBooking.studentId || rawBooking.userId || rawBooking.createdById || 'Unknown';
  const userName = booking.userInfo?.firstName 
    ? `${booking.userInfo.firstName} ${booking.userInfo.lastName}` 
    : `User #${fallbackId}`;

  const handleApprove = async () => {
    try {
      await approve(booking.id);
      onClose(); // Close modal on success, calendar will refresh via global trigger
    } catch (e) {
      console.error("Failed to approve", e);
    }
  };

  const handleReject = async () => {
    try {
      await reject(booking.id, "Admin rejected due to scheduling constraints.");
      onClose();
    } catch (e) {
      console.error("Failed to reject", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        
        {/* Header */}
        <div className="border-b bg-slate-50 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Booking Details</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
            booking.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
            booking.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {booking.status}
          </span>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 font-medium">Equipment</p>
              <p className="font-semibold text-slate-900">{booking.equipment?.name || booking.equipmentId}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Requested By</p>
              <p className="font-semibold text-slate-900">{userName}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Start Time</p>
              <p className="font-semibold text-slate-900">{new Date(booking.startTime).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">End Time</p>
              <p className="font-semibold text-slate-900">{new Date(booking.endTime).toLocaleString()}</p>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-slate-500 font-medium text-sm">Purpose</p>
            <p className="text-slate-800 bg-slate-50 p-3 rounded-md mt-1 border text-sm">
              {booking.purpose || 'No specific purpose provided.'}
            </p>
          </div>

          {/* Waitlist & Conflict Section */}
          {conflictData && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex items-start">
                <ShieldAlert className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-800">Scheduling Conflict Detected</h4>
                  <p className="text-sm text-red-700 mt-1">{conflictData.message}</p>
                  
                  <div className="mt-3 text-sm text-red-800 bg-white/50 p-2 rounded border border-red-100">
                    <p className="font-semibold mb-1">Resolution Suggestions:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Review the overlapping primary booking.</li>
                      <li>Contact the user to suggest an alternative time slot.</li>
                      <li>Reject this request to clear the waitlist queue.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!conflictData && booking.waitlistPosition && booking.waitlistPosition > 0 && (
            <div className="mt-4 flex items-center rounded-md border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">
              <Clock className="h-5 w-5 mr-2 text-yellow-600" />
              <p className="text-sm">
                <span className="font-semibold">Waitlisted:</span> This booking is currently in position <strong>#{booking.waitlistPosition}</strong> for this time slot.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-slate-50 px-6 py-4 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>

          {/* Admin Actions (Only visible to admins for Pending status) */}
          {isAdmin && booking.status === 'PENDING' && (
            <div className="flex space-x-2">
              <Button 
                variant="destructive" 
                onClick={handleReject} 
                disabled={isRejecting}
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button 
                onClick={handleApprove} 
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}