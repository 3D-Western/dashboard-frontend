import { PageContainer } from '@/components/PageContainer';
import type { Metadata } from 'next';
import { invitationApi } from '@/api/client/invitation';
import { withSessionErrorHandling } from '@/lib/server-utils';
import { AdminInvitationFilters } from './components/AdminInvitationFilters';
import { CreateInvitationButton } from './components/CreateInvitationButton';
import InvitationsTable from './components/InvitationsTable';
import { InvitationStatus } from '@/types/invitation';
import PageTitle from '@/components/PageTitle';
import { validateSession } from '@/lib/auth';
import { hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import UnauthorizedPage from '@/components/UnauthorizedPage';

export const metadata: Metadata = {
  title: 'Invitation Management',
  description: 'Manage user registration invitations',
};

interface InvitationManagementPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    status?: string;
    email?: string;
  }>;
}

export default async function InvitationManagementPage({
  searchParams,
}: InvitationManagementPageProps) {
  const user = await validateSession();
  if (!user || !hasPermission(user, PERMISSIONS.INVITATIONS_LIST))
    return <UnauthorizedPage title="Invitation Management" />;

  const userCanCreateInvitation = hasPermission(user, PERMISSIONS.INVITATIONS_CREATE);
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;
  const status = params.status as InvitationStatus | undefined;
  const email = params.email;

  // Fetch invitations with server-side pagination and filters
  const { data: invitations, pagination } = await withSessionErrorHandling(() =>
    invitationApi.listInvitations({ page, pageSize, status, email }),
  );

  return (
    <PageContainer className="space-y-6 p-6">
      {/* Phones: button under the title (like My Jobs); PageTitle's own bottom margin is dropped here */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
        <div className="flex-1 [&>div]:mb-0">
          <PageTitle
            title="Invitation Management"
            description="Manage user registration invitations"
          />
        </div>
        {userCanCreateInvitation && <CreateInvitationButton />}
      </div>

      <AdminInvitationFilters />

      <div>
        <InvitationsTable invitations={invitations} pagination={pagination} />
      </div>
    </PageContainer>
  );
}
