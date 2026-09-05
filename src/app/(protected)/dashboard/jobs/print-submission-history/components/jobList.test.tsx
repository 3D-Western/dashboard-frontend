import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import JobList from './jobList';
import { createMockPrintJob } from '@test/utils/mockFactories';
import { JobDetail } from '@/types/jobs';

describe('JobList', () => {
  it('shows an empty state with a link to New Job when there are no jobs', () => {
    render(<JobList jobs={[]} />);

    expect(screen.getByText(/haven.t printed anything yet/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /start printing/i });
    expect(link).toHaveAttribute('href', '/dashboard/jobs/new');
  });

  it('renders job cards instead of the empty state when jobs exist', () => {
    const job = createMockPrintJob({ name: 'My Print Job' }) as unknown as JobDetail;
    render(<JobList jobs={[job]} />);

    expect(screen.getByText('My Print Job')).toBeInTheDocument();
    expect(screen.queryByText(/haven.t printed anything yet/i)).not.toBeInTheDocument();
  });
});
