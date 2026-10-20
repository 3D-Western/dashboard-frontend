import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@test/utils/render';
import { createMockPrintJob } from '@test/utils/mockFactories';
import { PaginationMetadata } from '@/types/common';
import { PrintJob } from '@/types/jobs';
import { JobList } from './JobList';
import { JobListEntry } from './JobListItem';

const pagination: PaginationMetadata = {
  page: 1,
  pageSize: 10,
  totalItems: 1,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
  snapshotCreatedBefore: '2026-10-13T00:00:00Z',
};

function renderList(jobs: JobListEntry[], hasFilters = false) {
  return render(<JobList jobs={jobs} pagination={pagination} hasFilters={hasFilters} />);
}

describe('JobList', () => {
  it('invites the user to create their first job when they have none', () => {
    renderList([]);

    expect(screen.getByText(/don't have any jobs yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create new job/i })).toHaveAttribute(
      'href',
      '/dashboard/jobs/print/new',
    );
  });

  it('offers to clear filters when nothing matches', () => {
    renderList([], true);

    expect(screen.getByText(/no jobs match/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /clear filters/i })).toHaveAttribute(
      'href',
      '/dashboard/jobs',
    );
  });

  it('shows each job with its stage and a link to its details', () => {
    const job = createMockPrintJob({ name: 'Drone Propeller Guards', status: 'InQueue' });
    renderList([job]);

    const item = screen.getByRole('listitem');
    expect(within(item).getByText('Queued')).toBeInTheDocument();
    expect(within(item).getByRole('link', { name: 'Drone Propeller Guards' })).toHaveAttribute(
      'href',
      `/dashboard/jobs/${job.id}`,
    );
  });

  it('asks the user to upload the file for a job whose upload never finished', () => {
    renderList([createMockPrintJob({ name: 'Keyboard Case', status: 'PendingFile' })]);

    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /upload file: keyboard case/i })).toBeInTheDocument();
  });

  it('shows print progress instead of a button while printing', () => {
    renderList([createMockPrintJob({ name: 'Bracket', status: 'Printing' })]);

    expect(screen.getByRole('progressbar', { name: /print progress/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view details: bracket/i })).not.toBeInTheDocument();
  });

  it('shows where to pick up a finished print', () => {
    const job = {
      ...createMockPrintJob({ name: 'Arm Base', status: 'Ready' }),
      pickupDetails: { location: 'Engineering Building, Room 101', hours: '', instructions: '' },
    };
    renderList([job]);

    expect(screen.getByText(/ready to pick up at engineering building, room 101/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /pickup info: arm base/i })).toBeInTheDocument();
  });

  it('shows why a job was declined', () => {
    const job: JobListEntry = {
      ...createMockPrintJob({ name: 'Huge Vase', status: 'Flagged' } as Partial<PrintJob>),
      statusHistory: [
        { status: 'InQueue', changedAt: '2026-10-01T10:00:00Z' },
        { status: 'Flagged', changedAt: '2026-10-02T10:00:00Z', comments: 'Over the size limit' },
      ],
    };
    renderList([job]);

    expect(screen.getByText('Issue')).toBeInTheDocument();
    expect(screen.getByText(/declined: over the size limit/i)).toBeInTheDocument();
  });

  it('shows the same jobs as a compact table in table view', () => {
    const jobs = [
      createMockPrintJob({ name: 'Bracket', status: 'Printing' }),
      createMockPrintJob({ name: 'Coasters', status: 'Succeeded' }),
    ];
    render(<JobList jobs={jobs} pagination={pagination} hasFilters={false} view="table" />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2 jobs
    expect(within(rows[1]).getByRole('link', { name: 'Bracket' })).toHaveAttribute(
      'href',
      `/dashboard/jobs/${jobs[0].id}`,
    );
    expect(within(rows[1]).getByRole('progressbar')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Collected')).toBeInTheDocument();
  });
});
