import type { Metadata } from 'next';
import PageTitle from '@/components/PageTitle';
import { validateSession } from '@/lib/auth';
import { hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { AdminRequestsQueue } from './components/AdminRequestsQueue';

export const metadata: Metadata = {
  title: 'Pending Requests Queue',
  description: 'Review and manage equipment booking requests requiring administrative approval',
};

export default async function AdminRequestsPage() {
  const user = await validateSession();
  if (!user || !hasPermission(user, PERMISSIONS.BOOKINGS_UPDATE_STATUS))
    return <UnauthorizedPage title="Pending Requests Queue" />;

  return (
    <div className="container space-y-6 p-6">
      <PageTitle
        title="Pending Requests Queue"
        description="Review and manage equipment booking requests requiring administrative approval"
      />
      <AdminRequestsQueue />
    </div>
  );
}
