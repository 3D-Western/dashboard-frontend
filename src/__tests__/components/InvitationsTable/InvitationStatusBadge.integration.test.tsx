import { describe, it, expect } from 'vitest';
import { render, screen } from '@test/utils/render';
import { InvitationStatusBadge } from '@/app/(protected)/admin/invitations/components/InvitationsTable/InvitationStatusBadge';
import type { InvitationStatus } from '@/types/invitation';

describe('InvitationStatusBadge Integration', () => {
  it('renders PENDING status correctly', () => {
    render(<InvitationStatusBadge status="PENDING" />);

    const badge = screen.getByText('Pending');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('role', 'status');
  });

  it('renders ACCEPTED status correctly', () => {
    render(<InvitationStatusBadge status="ACCEPTED" />);

    const badge = screen.getByText('Accepted');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('role', 'status');
  });

  it('renders EXPIRED status correctly', () => {
    render(<InvitationStatusBadge status="EXPIRED" />);

    const badge = screen.getByText('Expired');
    expect(badge).toBeInTheDocument();
  });

  it('renders REVOKED status correctly', () => {
    render(<InvitationStatusBadge status="REVOKED" />);

    const badge = screen.getByText('Revoked');
    expect(badge).toBeInTheDocument();
  });

  it('falls back to Unknown for unexpected status', () => {
    render(<InvitationStatusBadge status={'UNKNOWN' as unknown as InvitationStatus} />);

    const badge = screen.getByText('Unknown');
    expect(badge).toBeInTheDocument();
  });

  it('applies correct styling for PENDING status', () => {
    const { container } = render(<InvitationStatusBadge status="PENDING" />);

    const badge = container.querySelector('.bg-status-in-queue');
    expect(badge).toBeInTheDocument();
  });

  it('applies correct styling for ACCEPTED status', () => {
    const { container } = render(<InvitationStatusBadge status="ACCEPTED" />);

    const badge = container.querySelector('.bg-status-success');
    expect(badge).toBeInTheDocument();
  });

  it('applies correct styling for EXPIRED status', () => {
    const { container } = render(<InvitationStatusBadge status="EXPIRED" />);

    const badge = container.querySelector('.bg-status-flagged');
    expect(badge).toBeInTheDocument();
  });

  it('applies correct styling for REVOKED status', () => {
    const { container } = render(<InvitationStatusBadge status="REVOKED" />);

    const badge = container.querySelector('.bg-status-error');
    expect(badge).toBeInTheDocument();
  });

  it('sets accessibility label correctly', () => {
    render(<InvitationStatusBadge status="PENDING" />);

    const badge = screen.getByLabelText('Invitation status: Pending');
    expect(badge).toBeInTheDocument();
  });

  it('handles custom className prop', () => {
    const { container } = render(
      <InvitationStatusBadge status="PENDING" className="custom-class" />,
    );

    const badge = container.querySelector('.custom-class');
    expect(badge).toBeInTheDocument();
  });
});
