import { Booking } from '@/types/booking';
import { BookingStatusBadge } from './BookingStatusBadge';

interface AdminBookingListProps {
  bookings: Booking[];
  isLoading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
}

export default function AdminBookingList({
  bookings,
  isLoading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: AdminBookingListProps) {
  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading bookings...</div>;
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="rounded border border-border bg-muted/40 p-8 text-center text-muted-foreground">
        No bookings found for this criteria.
      </div>
    );
  }

  const isAllSelected = bookings.length > 0 && bookings.every((b) => selectedIds.includes(b.id));

  return (
    <div className="overflow-x-auto rounded-lg bg-card text-card-foreground shadow">
      <table className="min-w-full text-left text-sm whitespace-nowrap">
        <thead className="border-b-2 border-border bg-muted tracking-wider text-muted-foreground uppercase">
          <tr>
            <th className="w-10 px-6 py-4">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                className="rounded border-input text-primary focus:ring-ring"
              />
            </th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Equipment</th>
            <th className="px-6 py-4">User</th>
            <th className="px-6 py-4">Start Time</th>
            <th className="px-6 py-4">Duration</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} className="border-b border-border hover:bg-muted/50">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(booking.id)}
                  onChange={() => onToggleSelect(booking.id)}
                  className="rounded border-input text-primary focus:ring-ring"
                />
              </td>
              <td className="px-6 py-4">
                <BookingStatusBadge status={booking.status} />
              </td>
              <td className="px-6 py-4 font-medium">{booking.equipment.name}</td>
              <td className="px-6 py-4">
                {booking.userInfo.firstName} {booking.userInfo.lastName}
                <div className="text-xs text-muted-foreground">{booking.userInfo.studentId}</div>
              </td>
              <td className="px-6 py-4">{new Date(booking.startTime).toLocaleString()}</td>
              <td className="px-6 py-4">{booking.duration} mins</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
