'use client';

import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import { Loader2 } from 'lucide-react';
import { AvailabilitySlot } from '@/types/booking';
import { BookingDetailModal } from './BookingDetailModal';

interface BookingCalendarProps {
  slots: AvailabilitySlot[];
  isLoading?: boolean;
}

export default function BookingCalendar({ slots, isLoading }: BookingCalendarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{
    title: string;
    start: string;
    end: string;
  } | null>(null);

  const calendarEvents = slots.map((slot, index) => {
    const baseTitle = slot.isAvailable
      ? `${slot.remainingSlots} Available`
      : slot.isOwnBooking
        ? slot.purpose || 'Your Booking'
        : slot.reason || 'Booked';
    const title = slot.equipmentLabel ? `${slot.equipmentLabel} — ${baseTitle}` : baseTitle;

    return {
      id: `slot-${index}`,
      title,
      start: slot.startTime,
      end: slot.endTime,
      backgroundColor: slot.isAvailable
        ? 'var(--status-success)'
        : slot.isOwnBooking
          ? 'var(--primary)'
          : 'var(--destructive)',
      borderColor: slot.isAvailable
        ? 'var(--status-success)'
        : slot.isOwnBooking
          ? 'var(--primary)'
          : 'var(--destructive)',
      textColor: slot.isAvailable
        ? 'var(--status-success-foreground)'
        : slot.isOwnBooking
          ? 'var(--primary-foreground)'
          : '#ffffff',
    };
  });

  return (
    <div className="booking-calendar relative h-[700px] rounded-xl border bg-card p-4 shadow-sm">
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
        eventClick={(info: EventClickArg) => {
          setSelectedEvent({
            title: info.event.title,
            start: info.event.start?.toISOString() || '',
            end: info.event.end?.toISOString() || '',
          });
          setIsModalOpen(true);
        }}
      />

      <BookingDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eventDetails={selectedEvent}
      />
    </div>
  );
}
