'use client';

import { Booking } from '@/types/booking';
import { getEquipmentCategoryLabel } from '@/constants/equipment';
import { Calendar, Clock, Laptop } from 'lucide-react';

interface BookingListProps {
  bookings: Booking[];
}

export default function BookingList({ bookings }: BookingListProps) {
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

              <div className="flex items-center justify-between border-t pt-2 sm:border-none sm:pt-0">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    booking.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : booking.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {booking.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
