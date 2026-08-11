import type { Metadata } from 'next';
import PageTitle from '@/components/PageTitle';
import { validateSession } from '@/lib/auth';
import { hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { CapacityManagementClient } from './components/CapacityManagementClient';

export const metadata: Metadata = {
  title: 'Capacity & Restrictions',
  description: 'Manage booking capacity and restrictions for a piece of equipment',
};

interface CapacityPageProps {
  params: Promise<{ id: string }>;
}

export default async function CapacityManagementPage({ params }: CapacityPageProps) {
  const user = await validateSession();
  if (!user || !hasPermission(user, PERMISSIONS.BOOKINGS_READ))
    return <UnauthorizedPage title="Capacity & Restrictions" />;

  const { id } = await params;

  return (
    <div className="container space-y-6 p-6">
      <PageTitle
        title="Capacity & Restrictions"
        description="Manage booking capacity and restrictions for a piece of equipment"
      />
      <CapacityManagementClient equipmentId={id} />
    </div>
  );
}
