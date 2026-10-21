import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import InvitationsTable from '@/app/(protected)/admin/invitations/components/InvitationsTable';
import { createMockInvitation, createMockUser, perm } from '@test/utils/mockFactories';
import { PERMISSIONS } from '@/constants/permissions';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAdminUser = createMockUser({
  permissions: [perm(PERMISSIONS.INVITATIONS_READ), perm(PERMISSIONS.INVITATIONS_REVOKE)],
});

const pagination = {
  currentPage: 1,
  pageSize: 10,
  totalItems: 2,
  totalPages: 1,
};

describe('InvitationsTable on a phone', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  });

  it('shows each invitation as a card with its key fields, and no table', () => {
    const invitations = [
      createMockInvitation({
        email: 'jordan@uwo.ca',
        studentId: 251000111,
        status: 'PENDING',
        invitationCode: 'ABCD1234',
      }),
      createMockInvitation({ email: 'sam@uwo.ca', studentId: 251000222, status: 'ACCEPTED' }),
    ];

    render(<InvitationsTable invitations={invitations} pagination={pagination} />, {
      user: mockAdminUser,
    });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const cards = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(cards).toHaveLength(2);

    const card = cards[0];
    expect(within(card).getByText('jordan@uwo.ca')).toBeInTheDocument();
    expect(within(card).getByText(/Student ID: 251000111/)).toBeInTheDocument();
    expect(within(card).getByText(/Created:/)).toBeInTheDocument();
    expect(within(card).getByText(/Expires:/)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Copy email' })).toHaveClass('h-11', 'w-11');
    expect(within(card).getByRole('button', { name: 'Show invitation code' })).toHaveClass(
      'h-11',
      'w-11',
    );
  });

  it('renders the actions menu on each card, with 44 px targets, and it opens', async () => {
    const user = userEvent.setup();
    const invitations = [
      createMockInvitation({ email: 'jordan@uwo.ca', studentId: 251000111, status: 'PENDING' }),
    ];

    render(<InvitationsTable invitations={invitations} pagination={pagination} />, {
      user: mockAdminUser,
    });

    const card = within(screen.getByRole('list')).getByRole('listitem');
    const actions = within(card).getByRole('button', {
      name: /actions for invitation to jordan@uwo.ca/i,
    });
    expect(actions).toHaveClass('h-11', 'w-11');

    await user.click(actions);

    expect(screen.getByRole('menuitem', { name: /more info/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /revoke invitation/i })).toBeInTheDocument();
  });
});
