import { redirect } from 'next/navigation';

// TEMP: Booking Requests is out of scope for the initial launch — remove this guard (and re-add
// the "Booking Requests" tile/nav entry) when it's ready to ship. See docs/LAUNCH_SCOPE.md.
export default function AdminRequestsLayout({ children }: { children: React.ReactNode }) {
  redirect('/admin');
  return children;
}
