import { z } from 'zod';

export const newBookingSchema = z.object({
  equipmentId: z.string().min(1, 'Please select equipment.'),
  date: z.string().min(1, 'Please select a date.'),
  timeSlot: z.string().min(1, 'Please select a time slot.'),
  purpose: z.string().min(5, 'Please provide a brief purpose (min 5 characters).'),
  userNotes: z.string().optional(),
})

export type NewBookingFormData = z.infer<typeof newBookingSchema>;