import { Clock } from 'lucide-react';
import { Booking, ConflictResponse } from '@/types/booking';
import ConflictBanner from './ConflictBanner';

interface BookingDetailContentProps {
  booking: Booking;
  conflictData?: ConflictResponse;
}

// Shared field layout used by both the booking detail modal (calendar click-through)
// and the standalone /dashboard/bookings/[id] page, so the two can't drift apart.
export default function BookingDetailContent({ booking, conflictData }: BookingDetailContentProps) {
  const userName = booking.userInfo?.firstName
    ? `${booking.userInfo.firstName} ${booking.userInfo.lastName}`
    : `User #${booking.userInfo?.studentId ?? 'Unknown'}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium text-muted-foreground">Equipment</p>
          <p className="font-semibold text-foreground">
            {booking.equipment?.name || booking.equipmentId}
          </p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">Requested By</p>
          <p className="font-semibold text-foreground">{userName}</p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">Start Time</p>
          <p className="font-semibold text-foreground">
            {new Date(booking.startTime).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">End Time</p>
          <p className="font-semibold text-foreground">
            {new Date(booking.endTime).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="pt-2">
        <p className="text-sm font-medium text-muted-foreground">Purpose</p>
        <p className="mt-1 rounded-md border bg-muted/40 p-3 text-sm text-foreground">
          {booking.purpose || 'No specific purpose provided.'}
        </p>
      </div>

      {conflictData && <ConflictBanner conflict={conflictData} />}

      {!conflictData && booking.waitlistPosition && booking.waitlistPosition > 0 && (
        <div className="flex items-center rounded-md border border-yellow-200 bg-yellow-50 p-3 text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
          <Clock className="mr-2 h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm">
            <span className="font-semibold">Waitlisted:</span> This booking is currently in
            position <strong>#{booking.waitlistPosition}</strong> for this time slot.
          </p>
        </div>
      )}
    </div>
  );
}
