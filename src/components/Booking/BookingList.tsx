'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Booking } from '@/types/booking';
import { getEquipmentCategoryLabel } from '@/constants/equipment';
import { Calendar, Clock, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCancelBooking } from '@/hooks/useBookings';
import { BOOKING_STATUS_BADGE_CLASSES } from '@/constants/booking-status';

interface BookingListProps {
  bookings: Booking[];
  onCancelled?: () => void;
}

const CANCELLABLE_STATUSES: Booking['status'][] = ['APPROVED', 'PENDING'];

export default function BookingList({ bookings, onCancelled }: BookingListProps) {
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const { cancel, isPending: isCancelling, error: cancelError } = useCancelBooking();

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    try {
      await cancel(cancellingBooking.id);
      setCancellingBooking(null);
      onCancelled?.();
    } catch {
      // error is already captured in cancelError and rendered below
    }
  };

  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        You have no upcoming equipment reservations.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">My Reservations</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {bookings.map((booking) => {
          const startDate = new Date(booking.startTime);
          const endDate = new Date(booking.endTime);

          // Format dates and times cleanly
          const formattedDate = startDate.toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          const formattedTime = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

          return (
            <div
              key={booking.id}
              className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{booking.equipment.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({getEquipmentCategoryLabel(booking.equipment.category)})
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formattedTime}</span>
                  </div>
                </div>

                {booking.purpose && (
                  <p className="text-xs text-muted-foreground italic">“{booking.purpose}”</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t pt-2 sm:border-none sm:pt-0">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BOOKING_STATUS_BADGE_CLASSES[booking.status]}`}
                >
                  {booking.status}
                </span>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/bookings/${booking.id}`}>View Details</Link>
                  </Button>
                  {CANCELLABLE_STATUSES.includes(booking.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancellingBooking(booking)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}

      <AlertDialog
        open={cancellingBooking !== null}
        onOpenChange={(open) => !open && setCancellingBooking(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel your booking for{' '}
              <span className="font-semibold text-foreground">
                {cancellingBooking?.equipment.name}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
