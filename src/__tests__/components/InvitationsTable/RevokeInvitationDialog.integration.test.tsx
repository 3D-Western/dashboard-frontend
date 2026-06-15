import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { RevokeInvitationDialog } from '@/app/(protected)/admin/invitations/components/InvitationsTable/RevokeInvitationDialog';

describe('RevokeInvitationDialog Integration', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockOnConfirm.mockClear();
  });

  it('does not render when closed', () => {
    render(
      <RevokeInvitationDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        email="test@uwo.ca"
        onConfirm={mockOnConfirm}
      />,
    );

    expect(screen.queryByText('Revoke Invitation')).not.toBeInTheDocument();
  });

  it('renders dialog when open is true', () => {
    render(
      <RevokeInvitationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        email="test@uwo.ca"
        onConfirm={mockOnConfirm}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Revoke Invitation' })).toBeInTheDocument();
  });

  it('displays the email address in the confirmation message', () => {
    const email = 'john.doe@uwo.ca';
    render(
      <RevokeInvitationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        email={email}
        onConfirm={mockOnConfirm}
      />,
    );

    expect(screen.getByText(email)).toBeInTheDocument();
  });

  it('calls onConfirm when Revoke Invitation button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <RevokeInvitationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        email="test@uwo.ca"
        onConfirm={mockOnConfirm}
      />,
    );

    const revokeButton = screen.getByRole('button', { name: /revoke invitation/i });
    await user.click(revokeButton);

    expect(mockOnConfirm).toHaveBeenCalledOnce();
  });

  it('calls onOpenChange with false when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <RevokeInvitationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        email="test@uwo.ca"
        onConfirm={mockOnConfirm}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables buttons when isLoading is true', () => {
    render(
      <RevokeInvitationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        email="test@uwo.ca"
        onConfirm={mockOnConfirm}
        isLoading={true}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const revokeButton = screen.getByRole('button', { name: /revoking/i });

    expect(cancelButton).toBeDisabled();
    expect(revokeButton).toBeDisabled();
  });

  it('shows "Revoking..." text when isLoading is true', () => {
    render(
      <RevokeInvitationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        email="test@uwo.ca"
        onConfirm={mockOnConfirm}
        isLoading={true}
      />,
    );

    expect(screen.getByText('Revoking...')).toBeInTheDocument();
  });

  it('shows "Revoke Invitation" text when isLoading is false', () => {
    render(
      <RevokeInvitationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        email="test@uwo.ca"
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Revoke Invitation' })).toBeInTheDocument();
  });

  it('renders with destructive styling on revoke button', () => {
    render(
      <RevokeInvitationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        email="test@uwo.ca"
        onConfirm={mockOnConfirm}
      />,
    );

    const revokeButton = screen.getByRole('button', { name: /revoke invitation/i });
    expect(revokeButton).toHaveClass('bg-destructive');
  });

  it('displays warning message about revocation being permanent', () => {
    render(
      <RevokeInvitationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        email="test@uwo.ca"
        onConfirm={mockOnConfirm}
      />,
    );

    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
  });

  it('calls onOpenChange when dialog is closed via backdrop', async () => {
    const user = userEvent.setup();
    render(
      <RevokeInvitationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        email="test@uwo.ca"
        onConfirm={mockOnConfirm}
      />,
    );

    // The AlertDialog component allows closing via escape key
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalled();
    });
  });
});
