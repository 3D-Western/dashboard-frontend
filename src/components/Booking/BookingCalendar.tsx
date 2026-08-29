'use client';

import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import { Booking, ConflictResponse } from '@/types/booking';
import BookingDetailModal from './BookingDetailModal';
import { Loader2 } from 'lucide-react';
import { BOOKING_CALENDAR_EVENT_COLORS } from '@/constants/booking-status';

interface BookingCalendarProps {
  bookings: Booking[] | { data?: Booking[] };
  isLoading?: boolean;
}

export default function BookingCalendar({ bookings, isLoading }: BookingCalendarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<ConflictResponse | undefined>(undefined);

  // SAFE UNPACKING: If the incoming data is wrapped inside data.data from the backend, extract it safely
  const rawList: Booking[] = Array.isArray(bookings) ? bookings : (bookings?.data ?? []);

  const calendarEvents = rawList.map((booking) => {
    const { background: backgroundColor, border: initialBorderColor } =
      BOOKING_CALENDAR_EVENT_COLORS[booking.status];
    let borderColor = initialBorderColor;

    const hasConflict = booking.waitlistPosition && booking.waitlistPosition > 0;
    if (hasConflict) {
      borderColor = '#991b1b'; // Dark red border for conflicts
    }

    const machineName = booking.equipment?.name || booking.equipmentId || 'Equipment';
    const userName =
      booking.userInfo?.firstName || `User #${booking.userInfo?.studentId ?? 'Unknown'}`;

    return {
      id: booking.id,
      title: `${machineName} (${booking.status})`,
      start: booking.startTime,
      end: booking.endTime,
      backgroundColor,
      borderColor,
      textColor: booking.status === 'PENDING' ? '#000000' : '#ffffff', // Dark text for yellow bg
      extendedProps: {
        booking,
        hasConflict,
        machineName,
        userName,
      },
    };
  });

  return (
    <div className="booking-calendar relative h-175 rounded-xl border bg-card p-4 shadow-sm">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-card/60 backdrop-blur-[1px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={calendarEvents}
        height="100%"
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="22:00:00"
        eventOverlap={true}
        eventDidMount={(info) => {
          const { booking, hasConflict, userName, machineName } = info.event.extendedProps;
          if (!booking) return;

          const purpose = booking.purpose || 'No purpose provided';
          const waitlistText = hasConflict
            ? `\n⚠️ Waitlist Position: #${booking.waitlistPosition}`
            : '';

          info.el.setAttribute(
            'title',
            `Status: ${booking.status}\nUser: ${userName}\nEquipment: ${machineName}\nPurpose: ${purpose}${waitlistText}`,
          );

          if (hasConflict) {
            info.el.style.borderStyle = 'dashed';
            info.el.style.borderWidth = '3px';
            info.el.style.opacity = '0.8';
          }
        }}
        eventClick={(info: EventClickArg) => {
          const clickedBooking: Booking = info.event.extendedProps.booking;
          setSelectedBooking(clickedBooking);

          if (info.event.extendedProps.hasConflict) {
            setSelectedConflict({
              code: 'CAPACITY_EXCEEDED',
              message: `Equipment overbooked. Waitlist position: #${clickedBooking.waitlistPosition}`,
            });
          } else {
            setSelectedConflict(undefined);
          }

          setIsModalOpen(true);
        }}
      />

      {selectedBooking && (
        <BookingDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBooking(null);
            setSelectedConflict(undefined);
          }}
          booking={selectedBooking}
          conflictData={selectedConflict}
        />
      )}
    </div>
  );
}
