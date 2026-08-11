import type { Metadata } from 'next';
import PageTitle from '@/components/PageTitle';
import { validateSession } from '@/lib/auth';
import { hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { AdminBookingsDashboard } from './components/AdminBookingsDashboard';

export const metadata: Metadata = {
  title: 'Equipment Bookings',
  description: 'Manage all facility reservations and scheduling conflicts',
};

export default async function AdminBookingsPage() {
  const user = await validateSession();
  if (!user || !hasPermission(user, PERMISSIONS.BOOKINGS_LIST))
    return <UnauthorizedPage title="Equipment Bookings" />;

  return (
    <div className="container space-y-6 p-6">
      <PageTitle
        title="Equipment Bookings"
        description="Manage all facility reservations and scheduling conflicts"
      />
      <AdminBookingsDashboard />
    </div>
  );
}
