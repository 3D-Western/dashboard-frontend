import { describe, it, expect } from 'vitest';
import { render, screen } from '@test/utils/render';
import { PrintJobStatusBadge } from '@/components/PrintJobStatusBadge';

describe('PrintJobStatusBadge Integration', () => {
  it('renders PendingFile status correctly', () => {
    render(<PrintJobStatusBadge status="PendingFile" />);

    expect(screen.getByText('Pending File')).toBeInTheDocument();
  });

  it('renders InQueue status correctly', () => {
    render(<PrintJobStatusBadge status="InQueue" />);

    expect(screen.getByText('In Queue')).toBeInTheDocument();
  });

  it('renders Printing status correctly', () => {
    render(<PrintJobStatusBadge status="Printing" />);

    expect(screen.getByText('Printing')).toBeInTheDocument();
  });

  it('renders Ready status correctly', () => {
    render(<PrintJobStatusBadge status="Ready" />);

    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('renders Flagged status correctly', () => {
    render(<PrintJobStatusBadge status="Flagged" />);

    expect(screen.getByText('Flagged')).toBeInTheDocument();
  });

  it('renders Error status correctly', () => {
    render(<PrintJobStatusBadge status="Error" />);

    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders Succeeded status correctly', () => {
    render(<PrintJobStatusBadge status="Succeeded" />);

    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });

  it('renders Failed status correctly', () => {
    render(<PrintJobStatusBadge status="Failed" />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('falls back to Unknown label for unexpected status', () => {
    render(<PrintJobStatusBadge status={'UNKNOWN_STATUS' as never} />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(<PrintJobStatusBadge status="InQueue" />);

    const badge = container.querySelector('.inline-flex');
    expect(badge).toBeInTheDocument();
  });
});
