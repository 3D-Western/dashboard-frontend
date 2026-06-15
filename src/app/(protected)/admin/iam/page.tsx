import type { Metadata } from 'next';
import { iamApi } from '@/api/client/iam';
import PageTitle from '@/components/PageTitle';
import { validateSession } from '@/lib/auth';
import { withSessionErrorHandling } from '@/lib/server-utils';
import { hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { IamTabs } from './components/IamTabs';

export const metadata: Metadata = {
  title: 'IAM Management',
  description: 'Manage roles, groups, and permissions',
};

export default async function IamManagementPage() {
  const user = await validateSession();
  if (!user || !hasPermission(user, PERMISSIONS.IAM_READ))
    return <UnauthorizedPage title="IAM Management" />;

  const [roles, groups] = await withSessionErrorHandling(() =>
    Promise.all([iamApi.listRoles(false), iamApi.listGroups(false)]),
  );

  return (
    <div className="container space-y-6 p-6">
      <PageTitle title="IAM Management" description="Manage roles, groups, and permissions" />
      <IamTabs initialRoles={roles} initialGroups={groups} currentUser={user} />
    </div>
  );
}
