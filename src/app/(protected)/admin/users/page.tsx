import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { validateSession } from '@/lib/auth';
import { hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import UnauthorizedPage from '@/components/UnauthorizedPage';

export const metadata: Metadata = {
  title: 'User Management',
  description: 'Manage user accounts and permissions',
};

export default async function UserManagementPage() {
  const user = await validateSession();
  if (!user || !hasPermission(user, PERMISSIONS.USERS_LIST))
    return <UnauthorizedPage title="User Management" />;

  return (
    <div className="container space-y-6 p-6">
      <PageTitle title="User Management" description="Manage user accounts and permissions" />

      <div className="space-y-4 rounded-lg border p-8 text-center">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">User Management</h2>
          <p className="text-muted-foreground">
            User management features will be implemented here. This will include user listing, role
            management, and access control.
          </p>
        </div>
        <Button disabled>Coming Soon</Button>
      </div>
    </div>
  );
}
