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

    try {
      await createBooking({
        equipmentId: data.equipmentId,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl rounded-xl border bg-card p-6 shadow-sm">
        {displayError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Booking Failed</AlertTitle>
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold">Equipment</label>
          <select
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
            <label className="text-sm font-semibold">Start Time</label>
            <input
              type="datetime-local"
              {...register('startTime')}
              className="w-full rounded-md border bg-background p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">End Time</label>
            <input
              type="datetime-local"
              {...register('endTime')}
              className="w-full rounded-md border bg-background p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Purpose</label>
          <input
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
            rows={3}
            placeholder="Any special requirements or pickup notes..."
            {...register('userNotes')}
            className="w-full rounded-md border bg-background p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push('/dashboard/bookings')}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={isPending} className="w-full">
            <CalendarPlus className="mr-2 h-4 w-4" />
            {isPending ? 'Confirming...' : 'Confirm Booking'}
          </Button>
        </div>
      </form>

      <UnsavedChangesDialog isDirty={isDirty} />
    </>
  );
}