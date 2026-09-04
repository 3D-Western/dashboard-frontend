import { redirect } from 'next/navigation';

// TEMP: Equipment Bookings (admin) is out of scope for the initial launch — remove this guard
// (and re-add the "Equipment Bookings" tile/nav entry) when it's ready to ship.
// See docs/LAUNCH_SCOPE.md.
export default function AdminBookingsLayout({ children }: { children: React.ReactNode }) {
  redirect('/admin');
  return children;
}
