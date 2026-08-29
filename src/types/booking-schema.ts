import { z } from 'zod';

// Single source of truth for the fixed booking time slots - shared between the
// form (rendering the picker) and this schema (validating date+slot together).
export const TIME_SLOTS = [
  { label: '8:00 AM - 10:00 AM', start: '08:00:00', end: '10:00:00' },
  { label: '10:00 AM - 12:00 PM', start: '10:00:00', end: '12:00:00' },
  { label: '12:00 PM - 2:00 PM', start: '12:00:00', end: '14:00:00' },
  { label: '2:00 PM - 4:00 PM', start: '14:00:00', end: '16:00:00' },
  { label: '4:00 PM - 6:00 PM', start: '16:00:00', end: '18:00:00' },
  { label: '6:00 PM - 8:00 PM', start: '18:00:00', end: '20:00:00' },
];

const isTodayOrLater = (date: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${date}T00:00:00`) >= today;
};

const isNotAPastTimeSlotToday = (data: { date: string; timeSlot: string }) => {
  if (!data.date || !data.timeSlot) return true;
  const slot = TIME_SLOTS.find((s) => s.label === data.timeSlot);
  if (!slot) return true;
  return new Date(`${data.date}T${slot.start}`) >= new Date();
};

export const newBookingSchema = z
  .object({
    equipmentId: z.string().min(1, 'Please select equipment.'),
    date: z
      .string()
      .min(1, 'Please select a date.')
      .refine(isTodayOrLater, 'Please select today or a future date.'),
    timeSlot: z.string().min(1, 'Please select a time slot.'),
    purpose: z.string().min(5, 'Please provide a brief purpose (min 5 characters).'),
    userNotes: z.string().optional(),
    joinWaitlist: z.boolean().optional(),
  })
  .refine(isNotAPastTimeSlotToday, {
    message: 'This time slot has already passed today. Please select a later slot.',
    path: ['timeSlot'],
  });

export type NewBookingFormData = z.infer<typeof newBookingSchema>;
