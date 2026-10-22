import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import InvitationsTable from '@/app/(protected)/admin/users/components/InvitationsTable';
import {
  createMockPendingInvitation,
  createMockAcceptedInvitation,
  createMockExpiredInvitation,
  createMockRevokedInvitation,
  createMockUser,
  perm,
} from '@test/utils/mockFactories';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { endpoints } from '@/api/client/endpoints';
import { PERMISSIONS } from '@/constants/permissions';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const inTable = () => within(screen.getByRole('table'));
const pagination = { currentPage: 1, pageSize: 10, totalItems: 1, totalPages: 1 };

const adminCan = (...keys: string[]) => createMockUser({ permissions: keys.map((k) => perm(k)) });

describe('Invitations list: resend and member details', () => {
  const onResendSuccess = vi.fn();

  beforeAll(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const openMenu = async (user: ReturnType<typeof userEvent.setup>, email: string) =>
    user.click(inTable().getByRole('button', { name: `Actions for invitation to ${email}` }));

  it('shows the invitee name, member type and a reserved student number', () => {
    const invitation = createMockPendingInvitation({
      firstName: 'Jane',
      lastName: 'Roe',
      memberType: 'ALUMNI',
      studentId: 900000004,
    });

    render(<InvitationsTable invitations={[invitation]} pagination={pagination} />, {
      user: adminCan(PERMISSIONS.INVITATIONS_READ),
    });

    expect(inTable().getByText('Jane Roe')).toBeInTheDocument();
    expect(inTable().getByText('Alumni')).toBeInTheDocument();
    expect(inTable().getByText('900000004')).toBeInTheDocument();
  });

  it('resends a pending invitation and tells the list to refresh', async () => {
    const user = userEvent.setup();
    const invitation = createMockPendingInvitation({ id: 11 });
    let called = false;
    mockServer.use(
      http.post(`*${endpoints.invitations.resend(11)}`, () => {
        called = true;
        return HttpResponse.json({ success: true, data: invitation });
      }),
    );
    render(
      <InvitationsTable
        invitations={[invitation]}
        pagination={pagination}
        onResendSuccess={onResendSuccess}
      />,
      { user: adminCan(PERMISSIONS.INVITATIONS_CREATE) },
    );

    await openMenu(user, invitation.email);
    await user.click(screen.getByRole('menuitem', { name: /resend invitation/i }));

    await waitFor(() => expect(onResendSuccess).toHaveBeenCalledWith(invitation));
    expect(called).toBe(true);
    expect(toast.success).toHaveBeenCalledWith(`Invitation sent again to ${invitation.email}.`);
  });

  it('can resend an expired invitation', async () => {
    const user = userEvent.setup();
    const invitation = createMockExpiredInvitation({ id: 12 });
    render(<InvitationsTable invitations={[invitation]} pagination={pagination} />, {
      user: adminCan(PERMISSIONS.INVITATIONS_CREATE),
    });

    await openMenu(user, invitation.email);

    expect(screen.getByRole('menuitem', { name: /resend invitation/i })).toBeEnabled();
  });

  it.each([
    ['used', createMockAcceptedInvitation()],
    ['revoked', createMockRevokedInvitation()],
  ])('cannot resend a %s invitation', async (_label, invitation) => {
    const user = userEvent.setup();
    render(<InvitationsTable invitations={[invitation]} pagination={pagination} />, {
      user: adminCan(PERMISSIONS.INVITATIONS_CREATE),
    });

    await openMenu(user, invitation.email);

    expect(screen.getByRole('menuitem', { name: /resend invitation/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('keeps resend off for someone who cannot create invitations', async () => {
    const user = userEvent.setup();
    const invitation = createMockPendingInvitation();
    render(<InvitationsTable invitations={[invitation]} pagination={pagination} />, {
      user: adminCan(PERMISSIONS.INVITATIONS_LIST, PERMISSIONS.INVITATIONS_REVOKE),
    });

    await openMenu(user, invitation.email);

    expect(screen.getByRole('menuitem', { name: /resend invitation/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('shows the server message when resending is refused', async () => {
    const user = userEvent.setup();
    const invitation = createMockPendingInvitation({ id: 13 });
    mockServer.use(
      http.post(`*${endpoints.invitations.resend(13)}`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'INVITATION_CANNOT_BE_RESENT',
              message: 'Only pending or expired invitations can be sent again',
            },
          },
          { status: 409 },
        ),
      ),
    );
    render(
      <InvitationsTable
        invitations={[invitation]}
        pagination={pagination}
        onResendSuccess={onResendSuccess}
      />,
      { user: adminCan(PERMISSIONS.INVITATIONS_CREATE) },
    );

    await openMenu(user, invitation.email);
    await user.click(screen.getByRole('menuitem', { name: /resend invitation/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Only pending or expired invitations can be sent again',
      ),
    );
    expect(onResendSuccess).not.toHaveBeenCalled();
  });
});
