import { describe, it, expect } from 'vitest';
import { render, screen } from '@test/utils/render';
import { InvitationInfoDialog } from '@/app/(protected)/admin/invitations/components/InvitationsTable/InvitationInfoDialog';
import { createMockInvitation } from '@test/utils/mockFactories';
import type { InvitationCreator } from '@/types/invitation';

describe('InvitationInfoDialog Integration', () => {
  it('renders creator details when createdBy is available', () => {
    const invitation = createMockInvitation({
      createdBy: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        studentId: 251000123,
      },
    });

    render(
      <InvitationInfoDialog open={true} onOpenChange={() => {}} invitation={invitation} />,
    );

    expect(screen.getByText('Invitation Details')).toBeInTheDocument();
    expect(
      screen.getByText('Ada Lovelace (251000123)'),
    ).toBeInTheDocument();
  });

  it('renders placeholder when createdBy is missing', () => {
    const invitation = createMockInvitation({ createdBy: null as unknown as InvitationCreator });

    render(
      <InvitationInfoDialog open={true} onOpenChange={() => {}} invitation={invitation} />,
    );

    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
