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
import { useBookings, useAvailability, useAllEquipmentAvailability } from '@/hooks/useBookings';
import { useUser } from '@/providers/user-provider';
import { EQUIPMENT_CATEGORY_OPTIONS, ALL_EQUIPMENT_OPTION } from '@/constants/equipment';

export default function BookingsPage() {
  const router = useRouter();
  const user = useUser();

  const [selectedEquipment, setSelectedEquipment] = useState<string>(ALL_EQUIPMENT_OPTION.id);
  const isAllEquipment = selectedEquipment === ALL_EQUIPMENT_OPTION.id;

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

  const singleEquipment = useAvailability(
    isAllEquipment ? undefined : selectedEquipment,
    dateRange.from,
    dateRange.to,
  );
  const allEquipment = useAllEquipmentAvailability(
    isAllEquipment ? EQUIPMENT_CATEGORY_OPTIONS : undefined,
    dateRange.from,
    dateRange.to,
  );

  const {
    slots,
    isLoading: slotsLoading,
    error: slotsError,
  } = isAllEquipment ? allEquipment : singleEquipment;

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
              <option value={ALL_EQUIPMENT_OPTION.id}>{ALL_EQUIPMENT_OPTION.label}</option>
              {EQUIPMENT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {slotsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Calendar</AlertTitle>
              <AlertDescription>{slotsError}</AlertDescription>
            </Alert>
          ) : (
            <BookingCalendar slots={slots} isLoading={slotsLoading} />
          )}
        </div>

        <div className="h-[700px] overflow-y-auto rounded-xl border bg-muted/10 p-4">
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
