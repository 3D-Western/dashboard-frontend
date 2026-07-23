import { Booking } from '@/types/booking';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function BookingStatusTracker({ bookings }: { bookings: Booking[] }) {
  const recentBookings = bookings.slice(0, 5); 

  if (recentBookings.length === 0) return null;

  return (
    <div className="bg-card border rounded-xl p-4 shadow-sm space-y-4 mt-6">
      <h3 className="font-semibold text-lg border-b pb-2">Request Status Tracker</h3>
      <div className="space-y-3">
        {recentBookings.map((booking) => (
          <div key={booking.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-3">
              {booking.status === 'APPROVED' && <CheckCircle2 className="text-green-500 h-5 w-5" />}
              {booking.status === 'PENDING' && <Clock className="text-yellow-500 h-5 w-5" />}
              {booking.status === 'REJECTED' && <XCircle className="text-red-500 h-5 w-5" />}
              
              <div>
                <p className="font-medium">{booking.equipment.name}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(booking.startTime).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                booking.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {booking.status === 'PENDING' ? 'Awaiting Admin Approval' : booking.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}