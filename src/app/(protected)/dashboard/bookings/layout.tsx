import { redirect } from 'next/navigation';

// TEMP: Equipment Booking is out of scope for the initial launch — remove this guard (and
// re-add the "Equipment Booking" nav entry in AppSidebar) when it's ready to ship.
// See docs/LAUNCH_SCOPE.md.
export default function BookingsLayout({ children }: { children: React.ReactNode }) {
  redirect('/dashboard');
  return children;
}
