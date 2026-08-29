'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import BookingDetailContent from '@/components/Booking/BookingDetailContent';
import { useBooking, useCancelBooking } from '@/hooks/useBookings';
import { BOOKING_STATUS_BADGE_CLASSES } from '@/constants/booking-status';

const CANCELLABLE_STATUSES = ['APPROVED', 'PENDING'];

export function BookingDetailClient({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const { booking, isLoading, error, refetch } = useBooking(bookingId);
  const { cancel, isPending: isCancelling, error: cancelError } = useCancelBooking();

  const handleCancel = async () => {
    if (!booking) return;
    try {
      await cancel(booking.id);
      refetch();
    } catch (e) {
      console.error('Failed to cancel booking', e);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/bookings')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Bookings
      </Button>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error || !booking ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load reservation</AlertTitle>
          <AlertDescription>{error || 'This booking could not be found.'}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Reservation Details</h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${BOOKING_STATUS_BADGE_CLASSES[booking.status]}`}
            >
              {booking.status}
            </span>
          </div>

          <BookingDetailContent booking={booking} />

          {cancelError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{cancelError}</AlertDescription>
            </Alert>
          )}

          {CANCELLABLE_STATUSES.includes(booking.status) && (
            <Button variant="outline" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? 'Cancelling...' : 'Cancel Reservation'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
