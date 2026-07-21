import { z } from 'zod';

const isTodayOrLater = (date: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${date}T00:00:00`) >= today;
};

export const newBookingSchema = z.object({
  equipmentId: z.string().min(1, 'Please select equipment.'),
  date: z
    .string()
    .min(1, 'Please select a date.')
    .refine(isTodayOrLater, 'Please select today or a future date.'),
  timeSlot: z.string().min(1, 'Please select a time slot.'),
  purpose: z.string().min(5, 'Please provide a brief purpose (min 5 characters).'),
  userNotes: z.string().optional(),
});

export type NewBookingFormData = z.infer<typeof newBookingSchema>;
