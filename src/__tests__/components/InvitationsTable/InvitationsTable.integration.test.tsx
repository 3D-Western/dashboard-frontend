import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import InvitationsTable from '@/app/(protected)/admin/invitations/components/InvitationsTable';
import {
  createMockPendingInvitation,
  createMockAcceptedInvitation,
  createMockExpiredInvitation,
  createMockRevokedInvitation,
  createMockInvitations,
  createMockUser,
  perm,
} from '@test/utils/mockFactories';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { endpoints } from '@/api/client/endpoints';
import { PERMISSIONS } from '@/constants/permissions';

const mockAdminUser = createMockUser({
  permissions: [perm(PERMISSIONS.INVITATIONS_READ), perm(PERMISSIONS.INVITATIONS_REVOKE)],
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InvitationsTable Integration', () => {
  const mockOnRevokeSuccess = vi.fn();

  beforeEach(() => {
    mockOnRevokeSuccess.mockClear();
    vi.clearAllMocks();
  });

  describe('Table Rendering', () => {
    it('renders table with invitations data', () => {
      const invitations = createMockInvitations(3);
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 3,
        totalPages: 1,
      };

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
      );

      // Check if student IDs are rendered
      invitations.forEach((invitation) => {
        expect(screen.getByText(invitation.studentId.toString())).toBeInTheDocument();
      });
    });

    it('renders table headers correctly', () => {
      const invitations = createMockInvitations(1);
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
      );

      expect(screen.getByText('Student ID')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Invitation Code')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Expires')).toBeInTheDocument();
    });

    it('allows sorting by created and expires columns', async () => {
      const user = userEvent.setup();
      const invitations = createMockInvitations(1);
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
      );

      const createdSort = screen.getByRole('button', { name: /sort by created date/i });
      const expiresSort = screen.getByRole('button', { name: /sort by expiry date/i });

      await user.click(createdSort);
      await user.click(expiresSort);

      expect(createdSort).toBeInTheDocument();
      expect(expiresSort).toBeInTheDocument();
    });

    it('renders empty state when no invitations', () => {
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
      };

      render(
        <InvitationsTable
          invitations={[]}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
      );

      // Table should still render structure but be empty
      expect(screen.getByText('Student ID')).toBeInTheDocument();
    });
  });

  describe('Invitation Status Display', () => {
    it('displays PENDING status correctly', () => {
      const invitations = [createMockPendingInvitation()];
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
      );

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('displays ACCEPTED status correctly', () => {
      const invitations = [createMockAcceptedInvitation()];
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
      );

      expect(screen.getByText('Accepted')).toBeInTheDocument();
    });

    it('displays EXPIRED status correctly', () => {
      const invitations = [createMockExpiredInvitation()];
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
      );

      expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    it('displays REVOKED status correctly', () => {
      const invitations = [createMockRevokedInvitation()];
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
      );

      expect(screen.getByText('Revoked')).toBeInTheDocument();
    });
  });

  describe('Revoke Functionality', () => {
    it('shows revoke button for pending invitations', () => {
      const invitations = [createMockPendingInvitation()];
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
      );

      const moreButton = screen.getByRole('button', { name: /Actions for invitation/i });
      expect(moreButton).toBeInTheDocument();
    });

    it('updates local state when invitation is revoked', async () => {
      const user = userEvent.setup();
      const invitation = createMockPendingInvitation();
      const invitations = [invitation];
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      mockServer.use(
        http.patch(`*${endpoints.invitations.revoke(invitation.id)}`, () => {
          return HttpResponse.json({
            success: true,
            data: { ...invitation, status: 'REVOKED' as const },
          });
        }),
      );

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
        { user: mockAdminUser },
      );

      // Open dropdown menu
      const moreButton = screen.getByRole('button', { name: /Actions for invitation/i });
      await user.click(moreButton);

      // Click revoke
      const revokeButton = screen.getByRole('menuitem', { name: /revoke/i });
      await user.click(revokeButton);

      // Confirm revocation
      const confirmButton = screen.getByRole('button', { name: /revoke invitation/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnRevokeSuccess).toHaveBeenCalledWith(invitation.id);
      });

      // Status should update to REVOKED
      await waitFor(() => {
        expect(screen.getByText('Revoked')).toBeInTheDocument();
      });
    });

    it('updates local state without onRevokeSuccess and preserves other rows', async () => {
      const user = userEvent.setup();
      const pendingInvitation = createMockPendingInvitation({ id: 321 });
      const acceptedInvitation = createMockAcceptedInvitation({ id: 654 });
      const invitations = [pendingInvitation, acceptedInvitation];
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 2,
        totalPages: 1,
      };

      mockServer.use(
        http.patch(`*${endpoints.invitations.revoke(pendingInvitation.id)}`, () => {
          return HttpResponse.json({
            success: true,
            data: { ...pendingInvitation, status: 'REVOKED' as const },
          });
        }),
      );

      render(<InvitationsTable invitations={invitations} pagination={pagination} />, {
        user: mockAdminUser,
      });

      const moreButton = screen.getByRole('button', {
        name: `Actions for invitation to ${pendingInvitation.email}`,
      });
      await user.click(moreButton);

      const revokeButton = screen.getByRole('menuitem', { name: /revoke/i });
      await user.click(revokeButton);

      const confirmButton = screen.getByRole('button', { name: /revoke invitation/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Revoked')).toBeInTheDocument();
        expect(screen.getByText('Accepted')).toBeInTheDocument();
      });
    });

    it('calls onRevokeSuccess callback after successful revocation', async () => {
      const user = userEvent.setup();
      const invitation = createMockPendingInvitation({ id: 123 });
      const invitations = [invitation];
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      mockServer.use(
        http.patch(`*${endpoints.invitations.revoke(invitation.id)}`, () => {
          return HttpResponse.json({
            success: true,
            data: { ...invitation, status: 'REVOKED' as const },
          });
        }),
      );

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
        { user: mockAdminUser },
      );

      const moreButton = screen.getByRole('button', { name: /Actions for invitation/i });
      await user.click(moreButton);

      const revokeButton = screen.getByRole('menuitem', { name: /revoke/i });
      await user.click(revokeButton);

      const confirmButton = screen.getByRole('button', { name: /revoke invitation/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnRevokeSuccess).toHaveBeenCalledWith(123);
      });
    });

    it('shows error toast when revoke API fails', async () => {
      const toast = (await import('sonner')).toast;
      const user = userEvent.setup();
      const invitation = createMockPendingInvitation({ id: 456 });
      const invitations = [invitation];
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      // Mock API failure
      mockServer.use(
        http.patch(`*${endpoints.invitations.revoke(invitation.id)}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to revoke invitation',
              },
            },
            { status: 500 },
          );
        }),
      );

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
        { user: mockAdminUser },
      );

      const moreButton = screen.getByRole('button', { name: /Actions for invitation/i });
      await user.click(moreButton);

      const revokeButton = screen.getByRole('menuitem', { name: /revoke/i });
      await user.click(revokeButton);

      const confirmButton = screen.getByRole('button', { name: /revoke invitation/i });
      await user.click(confirmButton);

      // Wait for the async error handler to complete
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to revoke invitation. Please try again.');
      });

      // Should not call onRevokeSuccess
      expect(mockOnRevokeSuccess).not.toHaveBeenCalled();

      // Status should remain PENDING
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('Table Updates', () => {
    it('updates table when invitations prop changes', () => {
      const invitations1 = [createMockPendingInvitation({ studentId: 251000001 })];
      const invitations2 = [
        createMockPendingInvitation({ studentId: 251000001 }),
        createMockPendingInvitation({ studentId: 251000002 }),
      ];
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      const { rerender } = render(
        <InvitationsTable
          invitations={invitations1}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
      );

      expect(screen.getAllByText(/251000/)).toHaveLength(1);

      rerender(
        <InvitationsTable
          invitations={invitations2}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
      );

      expect(screen.getAllByText(/251000/)).toHaveLength(2);
    });
  });

  describe('Action Menu', () => {
    it('opens action menu when more button is clicked', async () => {
      const user = userEvent.setup();
      const invitations = [createMockPendingInvitation()];
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
      );

      const moreButton = screen.getByRole('button', { name: /Actions for invitation/i });
      await user.click(moreButton);

      expect(screen.getByRole('menuitem', { name: /more info/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /revoke invitation/i })).toBeInTheDocument();
    });

    it('opens the info dialog from the action menu', async () => {
      const user = userEvent.setup();
      const invitations = [createMockPendingInvitation()];
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
        { user: mockAdminUser },
      );

      const moreButton = screen.getByRole('button', { name: /Actions for invitation/i });
      await user.click(moreButton);

      const infoButton = screen.getByRole('menuitem', { name: /more info/i });
      await user.click(infoButton);

      expect(screen.getByText('Invitation Details')).toBeInTheDocument();
    });

    it('disables revoke action for non-pending invitations', async () => {
      const user = userEvent.setup();
      const invitations = [createMockAcceptedInvitation()];
      const pagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      };

      render(
        <InvitationsTable
          invitations={invitations}
          pagination={pagination}
          onRevokeSuccess={mockOnRevokeSuccess}
        />,
      );

      const moreButton = screen.getByRole('button', { name: /Actions for invitation/i });
      await user.click(moreButton);

      const revokeButton = screen.getByRole('menuitem', { name: /revoke invitation/i });
      expect(revokeButton).toHaveAttribute('aria-disabled', 'true');
    });

    describe('Permission Checks', () => {
      it('disables revoke action when user lacks INVITATIONS_REVOKE permission', async () => {
        const user = userEvent.setup();
        const invitations = [createMockPendingInvitation()];
        const pagination = { currentPage: 1, pageSize: 10, totalItems: 1, totalPages: 1 };
        const userWithoutRevokePermission = createMockUser({
          permissions: [perm(PERMISSIONS.INVITATIONS_READ)],
        });

        render(
          <InvitationsTable
            invitations={invitations}
            pagination={pagination}
            onRevokeSuccess={mockOnRevokeSuccess}
          />,
          { user: userWithoutRevokePermission },
        );

        const moreButton = screen.getByRole('button', { name: /Actions for invitation/i });
        await user.click(moreButton);

        const revokeButton = screen.getByRole('menuitem', { name: /revoke invitation/i });
        expect(revokeButton).toHaveAttribute('aria-disabled', 'true');
      });

      it('does not open revoke dialog when user lacks INVITATIONS_REVOKE permission', async () => {
        const user = userEvent.setup();
        const invitations = [createMockPendingInvitation()];
        const pagination = { currentPage: 1, pageSize: 10, totalItems: 1, totalPages: 1 };
        const userWithoutRevokePermission = createMockUser({
          permissions: [perm(PERMISSIONS.INVITATIONS_READ)],
        });

        render(
          <InvitationsTable
            invitations={invitations}
            pagination={pagination}
            onRevokeSuccess={mockOnRevokeSuccess}
          />,
          { user: userWithoutRevokePermission },
        );

        const moreButton = screen.getByRole('button', { name: /Actions for invitation/i });
        await user.click(moreButton);
        await user.click(screen.getByRole('menuitem', { name: /revoke invitation/i }));

        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(mockOnRevokeSuccess).not.toHaveBeenCalled();
      });

      it('disables more info action when user lacks INVITATIONS_READ permission', async () => {
        const user = userEvent.setup();
        const invitations = [createMockPendingInvitation()];
        const pagination = { currentPage: 1, pageSize: 10, totalItems: 1, totalPages: 1 };
        const userWithoutReadPermission = createMockUser({
          permissions: [perm(PERMISSIONS.INVITATIONS_REVOKE)],
        });

        render(
          <InvitationsTable
            invitations={invitations}
            pagination={pagination}
            onRevokeSuccess={mockOnRevokeSuccess}
          />,
          { user: userWithoutReadPermission },
        );

        const moreButton = screen.getByRole('button', { name: /Actions for invitation/i });
        await user.click(moreButton);

        const infoButton = screen.getByRole('menuitem', { name: /more info/i });
        expect(infoButton).toHaveAttribute('aria-disabled', 'true');
      });

      it('does not open info dialog when user lacks INVITATIONS_READ permission', async () => {
        const user = userEvent.setup();
        const invitations = [createMockPendingInvitation()];
        const pagination = { currentPage: 1, pageSize: 10, totalItems: 1, totalPages: 1 };
        const userWithoutReadPermission = createMockUser({
          permissions: [perm(PERMISSIONS.INVITATIONS_REVOKE)],
        });

        render(
          <InvitationsTable
            invitations={invitations}
            pagination={pagination}
            onRevokeSuccess={mockOnRevokeSuccess}
          />,
          { user: userWithoutReadPermission },
        );

        const moreButton = screen.getByRole('button', { name: /Actions for invitation/i });
        await user.click(moreButton);
        await user.click(screen.getByRole('menuitem', { name: /more info/i }));

        expect(screen.queryByText('Invitation Details')).not.toBeInTheDocument();
      });
    });
  });
});
