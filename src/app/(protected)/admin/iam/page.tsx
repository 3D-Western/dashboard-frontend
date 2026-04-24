import type { Metadata } from 'next';
import { Lock } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { validateSession } from '@/lib/auth';
import { hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import UnauthorizedPage from '@/components/UnauthorizedPage';

export const metadata: Metadata = {
  title: 'IAM Management',
  description: 'Manage roles, groups, and permissions',
};

export default async function IamManagementPage() {
  const user = await validateSession();
  if (!user || !hasPermission(user, PERMISSIONS.IAM_READ)) return <UnauthorizedPage title="IAM Management" />;

  return (
    <div className="container space-y-6 p-6">
      <PageTitle title="IAM Management" description="Manage roles, groups, and permissions" />

      <div className="space-y-4 rounded-lg border p-8 text-center">
        <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">IAM Management</h2>
          <p className="text-muted-foreground">
            Identity and access management features will be implemented here. This will include role
            management, group management, and permission assignment.
          </p>
        </div>
      </div>
    </div>
  );
}
