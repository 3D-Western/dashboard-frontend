import type { Metadata } from 'next';
import { invitationApi } from '@/api/client/invitation';
import { withSessionErrorHandling } from '@/lib/server-utils';
import { AdminInvitationFilters } from './components/AdminInvitationFilters';
import { CreateInvitationButton } from './components/CreateInvitationButton';
import InvitationsTable from './components/InvitationsTable';
import { InvitationStatus } from '@/types/invitation';
import PageTitle from '@/components/PageTitle';

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
    <div className="container space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <PageTitle
            title="Invitation Management"
            description="Manage user registration invitations"
          />
        </div>
        <CreateInvitationButton />
      </div>

      <AdminInvitationFilters />

      <div>
        <InvitationsTable invitations={invitations} pagination={pagination} />
      </div>
    </div>
  );
}
