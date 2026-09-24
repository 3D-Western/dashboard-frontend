import type { Metadata } from 'next';
import PageTitle from '@/components/PageTitle';
import { validateSession } from '@/lib/auth';
import { hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { userApi } from '@/api/client/user';
import { withSessionErrorHandling } from '@/lib/server-utils';
import UsersTable from './components/UsersTable';

export const metadata: Metadata = {
  title: 'User Management',
  description: 'Manage user accounts and permissions',
};

interface UserManagementPageProps {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}

export default async function UserManagementPage({ searchParams }: UserManagementPageProps) {
  const user = await validateSession();
  if (!user || !hasPermission(user, PERMISSIONS.USERS_LIST))
    return <UnauthorizedPage title="User Management" />;

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;

  const { data: users, pagination } = await withSessionErrorHandling(() =>
    userApi.listAdminUsers({ page, pageSize }),
  );

  return (
    <div className="container space-y-6 p-6">
      <PageTitle title="User Management" description="Manage user accounts and permissions" />

      <div>
        <UsersTable users={users} pagination={pagination} />
      </div>
    </div>
  );
}
