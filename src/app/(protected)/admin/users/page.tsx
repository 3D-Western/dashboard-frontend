import { PageContainer } from '@/components/PageContainer';
import type { Metadata } from 'next';
import PageTitle from '@/components/PageTitle';
import { validateSession } from '@/lib/auth';
import { hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { userApi } from '@/api/client/user';
import { invitationApi } from '@/api/client/invitation';
import { withSessionErrorHandling } from '@/lib/server-utils';
import type { InvitationStatus } from '@/types/invitation';
import UsersTable from './components/UsersTable';
import { AddNonWesternMemberButton } from './components/AddNonWesternMemberButton';
import { InvitationsPanel } from './components/InvitationsPanel';
import { UserManagementTabs } from './components/UserManagementTabs';

export const metadata: Metadata = {
  title: 'User Management',
  description: 'Manage user accounts and permissions',
};

interface UserManagementPageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    pageSize?: string;
    status?: string;
    email?: string;
  }>;
}

export default async function UserManagementPage({ searchParams }: UserManagementPageProps) {
  const user = await validateSession();
  if (!user || !hasPermission(user, PERMISSIONS.USERS_LIST))
    return <UnauthorizedPage title="User Management" />;

  const canSeeInvitations = hasPermission(user, PERMISSIONS.INVITATIONS_LIST);
  const canAddMember = hasPermission(user, PERMISSIONS.INVITATIONS_CREATE);

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;
  const tab = params.tab === 'invitations' && canSeeInvitations ? 'invitations' : 'users';

  let content;
  if (tab === 'invitations') {
    const { data: invitations, pagination } = await withSessionErrorHandling(() =>
      invitationApi.listInvitations({
        page,
        pageSize,
        status: params.status as InvitationStatus | undefined,
        email: params.email,
      }),
    );
    content = <InvitationsPanel invitations={invitations} pagination={pagination} />;
  } else {
    const { data: users, pagination } = await withSessionErrorHandling(() =>
      userApi.listAdminUsers({ page, pageSize }),
    );
    content = <UsersTable users={users} pagination={pagination} />;
  }

  return (
    <PageContainer className="space-y-6 p-6">
      {/* Phones: the button sits under the title (like My Jobs); PageTitle's own bottom margin is dropped here */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
        <div className="flex-1 [&>div]:mb-0">
          <PageTitle title="User Management" description="Manage user accounts and permissions" />
        </div>
        {canAddMember && <AddNonWesternMemberButton />}
      </div>

      <UserManagementTabs active={tab} showInvitations={canSeeInvitations} />

      <div>{content}</div>
    </PageContainer>
  );
}
