'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CalendarPlus } from 'lucide-react';

import { newBookingSchema, NewBookingFormData } from '@/types/booking-schema';
import { useCreateBooking } from '@/hooks/useBookings';
import { useUser } from '@/providers/user-provider';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const TIME_SLOTS = [
  { label: '8:00 AM - 10:00 AM', start: '08:00:00', end: '10:00:00' },
  { label: '10:00 AM - 12:00 PM', start: '10:00:00', end: '12:00:00' },
  { label: '12:00 PM - 2:00 PM', start: '12:00:00', end: '14:00:00' },
  { label: '2:00 PM - 4:00 PM', start: '14:00:00', end: '16:00:00' },
  { label: '4:00 PM - 6:00 PM', start: '16:00:00', end: '18:00:00' },
  { label: '6:00 PM - 8:00 PM', start: '18:00:00', end: '20:00:00' },
];

export default function NewBookingForm() {
  const router = useRouter();
  const  user  = useUser(); 
  const { mutate: createBooking, isPending, error: hookError } = useCreateBooking();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<NewBookingFormData>({
    resolver: zodResolver(newBookingSchema),
  });

  const onSubmit = async (data: NewBookingFormData) => {
    setAuthError(null);
    if (!user) {
      setAuthError('You must be logged in to create a booking.');
      return;
    }

    const selectedSlot = TIME_SLOTS.find(slot => slot.label === data.timeSlot);
    
    if (!selectedSlot) return; // Failsafe

    try {
      await createBooking({
        equipmentId: data.equipmentId,
        startTime: new Date(`${data.date}T${selectedSlot.start}`).toISOString(),
        endTime: new Date(`${data.date}T${selectedSlot.end}`).toISOString(),
        purpose: data.purpose,
        userNotes: data.userNotes,
        userInfo: {
          studentId: user.studentId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      });
      
      router.push('/dashboard/bookings');
      router.refresh(); 
    } catch (e) {
      console.error('Booking failed:', e);
    }
  };

  const displayError = authError || hookError;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-6">
        {displayError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Booking Failed</AlertTitle>
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Equipment</label>
            <select
              id="equipmentId"
              {...register('equipmentId')}
              className="w-full rounded-md border bg-background p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select Equipment...</option>
              <option value="printer-1">3D Printer 1</option>
              <option value="laser-1">Laser Cutter</option>
              <option value="cnc-1">CNC Router</option>
            </select>
            {errors.equipmentId && <p className="text-xs text-destructive">{errors.equipmentId.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Date</label>
              <input
                id="date"
                type="date"
                {...register('date')}
                className="w-full rounded-md border bg-background p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Time Slot</label>
              <select
                id="timeSlot"
                {...register('timeSlot')}
                className="w-full rounded-md border bg-background p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select Time Slot...</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.label} value={slot.label}>
                    {slot.label}
                  </option>
                ))}
              </select>
              {errors.timeSlot && <p className="text-xs text-destructive">{errors.timeSlot.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Purpose</label>
            <input
              id="purpose"
              type="text"
              placeholder="e.g., Capstone project prototyping"
              {...register('purpose')}
              className="w-full rounded-md border bg-background p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.purpose && <p className="text-xs text-destructive">{errors.purpose.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Additional Notes (Optional)</label>
            <textarea
              id="userNotes"
              rows={3}
              placeholder="Any special requirements or pickup notes..."
              {...register('userNotes')}
              className="w-full rounded-md border bg-background p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            className="w-full bg-red-400 text-white hover:bg-red-500"
            onClick={() => router.push('/dashboard/bookings')}
          >
            Cancel
          </Button>

          <Button 
            type="submit" 
            disabled={isPending} 
            className="w-full bg-sky-500/75 text-white hover:bg-sky-500"
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            {isPending ? 'Confirming...' : 'Confirm Booking'}
          </Button>
        </div>
      </form>

      <UnsavedChangesDialog isDirty={isDirty} />
    </>
  );
}