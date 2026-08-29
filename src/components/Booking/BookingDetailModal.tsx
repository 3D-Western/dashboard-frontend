'use client';

import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Booking, ConflictResponse } from '@/types/booking';
import { hasAnyAdminPermission } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useApproveBooking, useRejectBooking } from '@/hooks/useAdminBookings';
import { useUser } from '@/providers/user-provider';
import BookingDetailContent from './BookingDetailContent';
import { BOOKING_STATUS_BADGE_CLASSES } from '@/constants/booking-status';

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
  const { approve, isPending: isApproving, error: approveError } = useApproveBooking();
  const { reject, isPending: isRejecting, error: rejectError } = useRejectBooking();

  if (!booking) return null;

  const isAdmin = hasAnyAdminPermission(user);

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Booking Details</DialogTitle>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${BOOKING_STATUS_BADGE_CLASSES[booking.status]}`}
            >
              {booking.status}
            </span>
          </div>
        </DialogHeader>

        <BookingDetailContent booking={booking} conflictData={conflictData} />

        {(approveError || rejectError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{approveError || rejectError}</AlertDescription>
          </Alert>
        )}

        {/* Admin Actions (Only visible to admins for Pending status) */}
        <DialogFooter showCloseButton>
          {isAdmin && booking.status === 'PENDING' && (
            <>
              <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={isApproving}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
