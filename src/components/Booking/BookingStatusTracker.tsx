import { Booking } from '@/types/booking';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { BOOKING_STATUS_BADGE_CLASSES } from '@/constants/booking-status';

export default function BookingStatusTracker({ bookings }: { bookings: Booking[] }) {
  const recentBookings = bookings.slice(0, 5);

  if (recentBookings.length === 0) return null;

  return (
    <div className="mt-6 space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="border-b pb-2 text-lg font-semibold">Request Status Tracker</h3>
      <div className="space-y-3">
        {recentBookings.map((booking) => (
          <div key={booking.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-3">
              {booking.status === 'APPROVED' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {booking.status === 'PENDING' && <Clock className="h-5 w-5 text-yellow-500" />}
              {booking.status === 'REJECTED' && <XCircle className="h-5 w-5 text-red-500" />}

              <div>
                <p className="font-medium">{booking.equipment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(booking.startTime).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${BOOKING_STATUS_BADGE_CLASSES[booking.status]}`}
              >
                {booking.status === 'PENDING' ? 'Awaiting Admin Approval' : booking.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
