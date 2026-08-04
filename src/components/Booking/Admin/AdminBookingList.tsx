import { Booking } from '@/types/booking';

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
    return <div className="p-8 text-center text-gray-500">Loading bookings...</div>;
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="rounded border bg-gray-50 p-8 text-center text-gray-500">
        No bookings found for this criteria.
      </div>
    );
  }

  const isAllSelected = bookings.length > 0 && bookings.every((b) => selectedIds.includes(b.id));

  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow">
      <table className="min-w-full text-left text-sm whitespace-nowrap">
        <thead className="border-b-2 bg-gray-50 tracking-wider uppercase">
          <tr>
            <th className="w-10 px-6 py-4">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
            <tr key={booking.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(booking.id)}
                  onChange={() => onToggleSelect(booking.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td className="px-6 py-4">
                <span
                  className={`rounded px-2 py-1 text-xs font-bold ${
                    booking.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : booking.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : booking.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {booking.status}
                </span>
              </td>
              <td className="px-6 py-4 font-medium">{booking.equipment.name}</td>
              <td className="px-6 py-4">
                {booking.userInfo.firstName} {booking.userInfo.lastName}
                <div className="text-xs text-gray-500">{booking.userInfo.studentId}</div>
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
