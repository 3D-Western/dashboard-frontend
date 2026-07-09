'use client';

import { useRouter } from 'next/navigation';
import BookingCalendar from '@/components/Booking/BookingCalendar';
import BookingList from '@/components/Booking/BookingList';
import { AvailabilityIndicator } from '@/components/Booking/AvailabilityIndicator';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Booking, AvailabilitySlot } from '@/types/booking';

export default function BookingsPage() {
  const router = useRouter();
  
  // Set up dynamic dates so the calendar always looks populated
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // MOCK 1: The Calendar Availability Data (What everyone sees)
  // TODO: Replace with Dev B's useAvailability hook -> const { data: slots } = useAvailability(selectedEquipment)
  const mockSlots: AvailabilitySlot[] = [
    {
      startTime: new Date(today.setHours(8, 0, 0, 0)).toISOString(),
      endTime: new Date(today.setHours(10, 0, 0, 0)).toISOString(),
      isAvailable: false,
      capacity: 2,
      remainingSlots: 0,
      reason: 'Booked'
    },
    {
      startTime: new Date(today.setHours(10, 0, 0, 0)).toISOString(),
      endTime: new Date(today.setHours(12, 0, 0, 0)).toISOString(),
      isAvailable: true,
      capacity: 2,
      remainingSlots: 1, 
    },
    {
      startTime: new Date(today.setHours(12, 0, 0, 0)).toISOString(),
      endTime: new Date(today.setHours(14, 0, 0, 0)).toISOString(),
      isAvailable: true,
      capacity: 2,
      remainingSlots: 2, 
    },
    {
      startTime: new Date(tomorrow.setHours(14, 0, 0, 0)).toISOString(),
      endTime: new Date(tomorrow.setHours(16, 0, 0, 0)).toISOString(),
      isAvailable: false, 
      capacity: 1,
      remainingSlots: 0,
      reason: 'Maintenance' 
    }
  ];

  // MOCK 2: The User's Personal Data (What populates the side list)
  // TODO: Replace with Dev B's useBookings hook -> const { data: myBookings } = useBookings({ userId: user.id })
  const mockUserBookings: Booking[] = [
    {
      id: 'bk-1',
      equipmentId: 'printer-1',
      equipment: { id: 'printer-1', name: '3D Printer 1', category: 'ThreeDPrinter', status: 'Available' },
      startTime: new Date(today.setHours(10, 0, 0, 0)).toISOString(),
      endTime: new Date(today.setHours(12, 0, 0, 0)).toISOString(),
      duration: 120,
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
      purpose: 'Prototyping chassis brackets',
      userInfo: { studentId: 123456, firstName: 'User', lastName: 'Dev', email: 'test@uwo.ca' }
    },
    {
      id: 'bk-2',
      equipmentId: 'laser-1',
      equipment: { id: 'laser-1', name: 'Laser Cutter 1', category: 'LaserCutter', status: 'Available' },
      startTime: new Date(tomorrow.setHours(14, 0, 0, 0)).toISOString(),
      endTime: new Date(tomorrow.setHours(16, 0, 0, 0)).toISOString(),
      duration: 120,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      purpose: 'Cutting acrylic panels for robot enclosure',
      userInfo: { studentId: 123456, firstName: 'User', lastName: 'Dev', email: 'test@uwo.ca' }
    }
  ];

  return (
    <div className="container space-y-8 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle 
          title="Equipment Schedule" 
          description="View availability and manage your reservations." 
        />
        <Button 
          onClick={() => router.push('/dashboard/bookings/new')}
          className="bg-green-600 text-white hover:bg-green-700 w-full sm:w-auto"
        >
          + New Booking
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AvailabilityIndicator />
          <BookingCalendar slots={mockSlots} />
        </div>
        
        <div className="rounded-xl border bg-muted/10 p-4 h-fit">
          <BookingList bookings={mockUserBookings} />
        </div>
      </div>
    </div>
  );
}