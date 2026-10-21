import { describe, it, expect, vi } from 'vitest';
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

// jsdom applies no CSS, so the switch is checked through the classes that CSS acts on: the cards
// wrapper hides from xl up, the table wrapper hides below it.
function expectCardsBelowXl() {
  expect(screen.getByRole('list').parentElement).toHaveClass('xl:hidden');
  expect(screen.getByRole('table').closest('[class~="xl:block"]')).toHaveClass('hidden');
}

describe('InvitationsTable on a phone', () => {
  it('shows each invitation as a card with its key fields, and the table is hidden', () => {
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

    expectCardsBelowXl();
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

  it('keeps the cards at 1024 px (iPad landscape), where the table does not fit', () => {
    const invitations = [createMockInvitation({ email: 'jordan@uwo.ca', status: 'PENDING' })];

    render(<InvitationsTable invitations={invitations} pagination={pagination} />, {
      user: mockAdminUser,
    });

    expectCardsBelowXl();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(1);
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

describe('InvitationsTable on a laptop', () => {
  it('shows the table from xl (1280 px), where the six columns fit, and the cards are hidden', () => {
    const invitations = [createMockInvitation({ email: 'jordan@uwo.ca', status: 'PENDING' })];

    render(<InvitationsTable invitations={invitations} pagination={pagination} />, {
      user: mockAdminUser,
    });

    expect(screen.getByRole('table', { name: 'Invitations table' })).toBeInTheDocument();
    expectCardsBelowXl();
  });
});
