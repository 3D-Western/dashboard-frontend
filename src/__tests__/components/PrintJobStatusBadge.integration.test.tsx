import { describe, it, expect } from 'vitest';
import { render, screen } from '@test/utils/render';
import { PrintJobStatusBadge } from '@/components/PrintJobStatusBadge';

describe('PrintJobStatusBadge Integration', () => {
  it('renders DRAFT status correctly', () => {
    render(<PrintJobStatusBadge status="DRAFT" />);

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders IN_QUEUE status correctly', () => {
    render(<PrintJobStatusBadge status="IN_QUEUE" />);

    expect(screen.getByText('In Queue')).toBeInTheDocument();
  });

  it('renders PRINTING status correctly', () => {
    render(<PrintJobStatusBadge status="PRINTING" />);

    expect(screen.getByText('Printing')).toBeInTheDocument();
  });

  it('renders READY status correctly', () => {
    render(<PrintJobStatusBadge status="READY" />);

    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('renders FLAGGED status correctly', () => {
    render(<PrintJobStatusBadge status="FLAGGED" />);

    expect(screen.getByText('Flagged')).toBeInTheDocument();
  });

  it('renders ERROR status correctly', () => {
    render(<PrintJobStatusBadge status="ERROR" />);

    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders CANCELLED status correctly', () => {
    render(<PrintJobStatusBadge status="CANCELLED" />);

    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders SUCCESS status correctly', () => {
    render(<PrintJobStatusBadge status="SUCCESS" />);

    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('renders FAIL status correctly', () => {
    render(<PrintJobStatusBadge status="FAIL" />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('falls back to Unknown label for unexpected status', () => {
    render(<PrintJobStatusBadge status={'UNKNOWN_STATUS' as never} />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(<PrintJobStatusBadge status="IN_QUEUE" />);

    const badge = container.querySelector('.inline-flex');
    expect(badge).toBeInTheDocument();
  });
});
