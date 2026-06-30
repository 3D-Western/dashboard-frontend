import { z } from 'zod';

export const newBookingSchema = z.object({
  equipmentId: z.string().min(1, 'Please select equipment.'),
  startTime: z.string().min(1, 'Start time is required.'),
  endTime: z.string().min(1, 'End time is required.'),
  purpose: z.string().min(5, 'Please provide a brief purpose (min 5 characters).'),
  userNotes: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.startTime).getTime();
  const end = new Date(data.endTime).getTime();
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export type NewBookingFormData = z.infer<typeof newBookingSchema>;