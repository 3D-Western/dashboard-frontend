'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import BookingCalendar from '@/components/Booking/BookingCalendar';
import BookingList from '@/components/Booking/BookingList';
import BookingStatusTracker from '@/components/Booking/BookingStatusTracker';
import { AvailabilityIndicator } from '@/components/Booking/AvailabilityIndicator';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBookings } from '@/hooks/useBookings';
import { useUser } from '@/providers/user-provider';
import { EQUIPMENT_CATEGORY_OPTIONS, ALL_EQUIPMENT_OPTION } from '@/constants/equipment';

export default function BookingsPage() {
  const router = useRouter();
  const user = useUser();

  const [selectedEquipment, setSelectedEquipment] = useState<string>(ALL_EQUIPMENT_OPTION.id);

  const bookingParams = useMemo(() => {
    const trueUserId = user?.studentId;
    // Calendar needs every booking in view, not a paginated slice — fetch a large page.
    // TODO: switch to date-range (from/to) fetching so this scales past 1000.
    return trueUserId ? { userId: trueUserId, pageSize: 1000 } : { pageSize: 1000 };
  }, [user]);

  const {
    bookings,
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch,
  } = useBookings(bookingParams);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (selectedEquipment === ALL_EQUIPMENT_OPTION.id) return bookings;
    return bookings.filter((b) => b.equipment.category === selectedEquipment);
  }, [bookings, selectedEquipment]);

  return (
    <div className="container space-y-8 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="Equipment Schedule"
          description="View availability and manage your reservations."
        />
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" className="w-full sm:w-auto">
            Refresh
          </Button>
          <Button
            onClick={() => router.push('/dashboard/bookings/new')}
            className="w-full sm:w-auto"
          >
            + New Booking
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Calendar Section */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <AvailabilityIndicator />

            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              disabled={bookingsLoading}
              className="rounded-md border bg-background p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-50"
            >
              <option value={ALL_EQUIPMENT_OPTION.id}>{ALL_EQUIPMENT_OPTION.label}</option>
              {EQUIPMENT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.category} value={option.category}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {bookingsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Calendar</AlertTitle>
              <AlertDescription>{bookingsError}</AlertDescription>
            </Alert>
          ) : bookingsLoading ? (
            <div className="flex h-100 items-center justify-center rounded-xl border bg-muted/10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <BookingCalendar bookings={filteredBookings} />
          )}
        </div>

        {/* Status Tracker & Sidebar Information Column */}
        <div className="h-fit space-y-6 rounded-xl border bg-muted/10 p-4">
          {!bookingsError && !bookingsLoading && bookings && bookings.length > 0 && (
            <BookingStatusTracker bookings={bookings} />
          )}

          <div className={bookings && bookings.length > 0 ? 'border-t pt-4' : ''}>
            <h3 className="mb-4 font-semibold">My Bookings</h3>

            {bookingsError ? (
              <p className="text-sm text-destructive">{bookingsError}</p>
            ) : bookingsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !bookings || bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">You have no upcoming bookings.</p>
            ) : (
              <BookingList bookings={bookings} onCancelled={refetch} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
