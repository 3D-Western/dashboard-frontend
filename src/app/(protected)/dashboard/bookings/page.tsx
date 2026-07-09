'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import BookingCalendar from '@/components/Booking/BookingCalendar';
import BookingList from '@/components/Booking/BookingList';
import { AvailabilityIndicator } from '@/components/Booking/AvailabilityIndicator';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBookings, useAvailability } from '@/hooks/useBookings';
import { useUser } from '@/providers/user-provider';

export default function BookingsPage() {
  const router = useRouter();
  const user = useUser();

  const [selectedEquipment, setSelectedEquipment] = useState<string>('printer-1');

  const dateRange = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 30);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const bookingParams = useMemo(() => {
    return user ? { userId: user.studentId } : undefined;
  }, [user]);

  const { bookings, isLoading: bookingsLoading, error: bookingsError } = useBookings(bookingParams);

  const {
    slots,
    isLoading: slotsLoading,
    error: slotsError,
  } = useAvailability(selectedEquipment, dateRange.from, dateRange.to);

  return (
    <div className="container space-y-8 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="Equipment Schedule"
          description="View availability and manage your reservations."
        />
        <Button
          onClick={() => router.push('/dashboard/bookings/new')}
          className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
        >
          + New Booking
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <AvailabilityIndicator />

            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="rounded-md border bg-background p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="printer-1">3D Printer 1</option>
              <option value="laser-1">Laser Cutter</option>
              <option value="cnc-1">CNC Router</option>
            </select>
          </div>

          {slotsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Calendar</AlertTitle>
              <AlertDescription>{slotsError}</AlertDescription>
            </Alert>
          ) : slotsLoading ? (
            <div className="flex h-[400px] items-center justify-center rounded-xl border bg-muted/10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <BookingCalendar slots={slots} />
          )}
        </div>

        <div className="h-fit rounded-xl border bg-muted/10 p-4">
          <h3 className="mb-4 font-semibold">My Bookings</h3>

          {bookingsError ? (
            <p className="text-sm text-destructive">{bookingsError}</p>
          ) : bookingsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no upcoming bookings.</p>
          ) : (
            <BookingList bookings={bookings} />
          )}
        </div>
      </div>
    </div>
  );
}
