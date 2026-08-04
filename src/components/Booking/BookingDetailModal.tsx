'use client';

import { useEffect } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Clock, X } from 'lucide-react';
import { Booking, ConflictResponse } from '@/types/booking';
import { hasAnyAdminPermission } from '@/types/user';
import { Button } from '@/components/ui/button';
import { useApproveBooking, useRejectBooking } from '@/hooks/useAdminBookings';
import { useUser } from '@/providers/user-provider';

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  conflictData?: ConflictResponse;
}

export default function BookingDetailModal({
  isOpen,
  onClose,
  booking,
  conflictData,
}: BookingDetailModalProps) {
  const user = useUser();
  const { approve, isPending: isApproving } = useApproveBooking();
  const { reject, isPending: isRejecting } = useRejectBooking();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!isOpen || !booking) return null;

  const isAdmin = hasAnyAdminPermission(user);

  const userName = booking.userInfo?.firstName
    ? `${booking.userInfo.firstName} ${booking.userInfo.lastName}`
    : `User #${booking.userInfo?.studentId ?? 'Unknown'}`;

  const handleApprove = async () => {
    try {
      await approve(booking.id);
      onClose(); // Close modal on success, calendar will refresh via global trigger
    } catch (e) {
      console.error('Failed to approve', e);
    }
  };

  const handleReject = async () => {
    try {
      await reject(booking.id, 'Admin rejected due to scheduling constraints.');
      onClose();
    } catch (e) {
      console.error('Failed to reject', e);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-slate-50 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-800">Booking Details</h2>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                booking.status === 'APPROVED'
                  ? 'bg-green-100 text-green-700'
                  : booking.status === 'REJECTED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {booking.status}
            </span>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-slate-500">Equipment</p>
              <p className="font-semibold text-slate-900">
                {booking.equipment?.name || booking.equipmentId}
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Requested By</p>
              <p className="font-semibold text-slate-900">{userName}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Start Time</p>
              <p className="font-semibold text-slate-900">
                {new Date(booking.startTime).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-500">End Time</p>
              <p className="font-semibold text-slate-900">
                {new Date(booking.endTime).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-sm font-medium text-slate-500">Purpose</p>
            <p className="mt-1 rounded-md border bg-slate-50 p-3 text-sm text-slate-800">
              {booking.purpose || 'No specific purpose provided.'}
            </p>
          </div>

          {/* Waitlist & Conflict Section */}
          {conflictData && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex items-start">
                <ShieldAlert className="mt-0.5 mr-2 h-5 w-5 text-red-600" />
                <div>
                  <h4 className="text-sm font-semibold text-red-800">
                    Scheduling Conflict Detected
                  </h4>
                  <p className="mt-1 text-sm text-red-700">{conflictData.message}</p>

                  <div className="mt-3 rounded border border-red-100 bg-white/50 p-2 text-sm text-red-800">
                    <p className="mb-1 font-semibold">Resolution Suggestions:</p>
                    <ul className="list-disc space-y-1 pl-4">
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
              <Clock className="mr-2 h-5 w-5 text-yellow-600" />
              <p className="text-sm">
                <span className="font-semibold">Waitlisted:</span> This booking is currently in
                position <strong>#{booking.waitlistPosition}</strong> for this time slot.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t bg-slate-50 px-6 py-4">
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
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
