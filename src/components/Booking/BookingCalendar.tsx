'use client';

import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { AvailabilitySlot } from '@/types/booking';
import { BookingDetailModal } from './BookingDetailModal';


interface BookingCalendarProps {
  slots: AvailabilitySlot[];
}

export default function BookingCalendar({ slots }: BookingCalendarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{title: string, start: string, end: string} | null>(null);

  const calendarEvents = slots.map((slot, index) => {
    const isAvailable = slot.remainingSlots > 0;
    return {
      id: `slot-${index}`,
      title: slot.isAvailable ? `${slot.remainingSlots} Available` : (slot.reason || 'Booked'),
      start: slot.startTime,
      end: slot.endTime,
      backgroundColor: slot.isAvailable ? '#75e09c' : '#f76b6b', 
      borderColor: slot.isAvailable ? '#16a34a' : '#dc2626',
      textColor: '#ffffff',
    };
  });

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={calendarEvents}
        height="auto"
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="22:00:00"
        eventClick={(info) => {
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