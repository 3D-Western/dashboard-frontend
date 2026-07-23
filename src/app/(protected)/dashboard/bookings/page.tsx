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

export default function BookingsPage() {
  const router = useRouter();
  const user = useUser();

  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');

  const bookingParams = useMemo(() => {
    const rawUser = user as any;
    const trueUserId = rawUser?.id || user?.studentId;
    return trueUserId ? { userId: trueUserId } : undefined;
  }, [user]);

  const { bookings, isLoading: bookingsLoading, error: bookingsError, refetch } = useBookings(bookingParams);

  const availableEquipment = useMemo(() => {
    if (!bookings) return [];
    return Array.from(new Set(bookings.map((b) => b.equipmentId)));
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (selectedEquipment === 'all') return bookings;
    return bookings.filter((b) => b.equipmentId === selectedEquipment);
  }, [bookings, selectedEquipment]);

  return (
    <div className="container space-y-8 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="Equipment Schedule"
          description="View availability and manage your reservations."
        />
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Refresh
          </Button>
          <Button
            onClick={() => router.push('/dashboard/bookings/new')}
            className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
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
              <option value="all">All Equipment</option>
              {availableEquipment.map((equipmentId) => (
                <option key={equipmentId} value={equipmentId}>
                  {equipmentId}
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
            <div className="flex h-[400px] items-center justify-center rounded-xl border bg-muted/10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <BookingCalendar bookings={filteredBookings} />
          )}
        </div>

        {/* Status Tracker & Sidebar Information Column */}
        <div className="h-fit rounded-xl border bg-muted/10 p-4 space-y-6">
          {!bookingsError && !bookingsLoading && bookings && bookings.length > 0 && (
            <BookingStatusTracker bookings={bookings} />
          )}

          <div className={bookings && bookings.length > 0 ? "pt-4 border-t" : ""}>
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
              <BookingList bookings={bookings} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}