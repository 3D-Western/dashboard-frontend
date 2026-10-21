import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import PrintJobsTable from '@/components/PrintJobsTable';
import { createMockPrintJob } from '@test/utils/mockFactories';
import { PaginationMetadata } from '@/types/common';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const pagination: PaginationMetadata = {
  page: 1,
  pageSize: 10,
  totalItems: 2,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
  snapshotCreatedBefore: new Date('2026-10-01T00:00:00Z').toISOString(),
};

const withUser = (name: string, firstName: string, lastName: string) => {
  const base = createMockPrintJob();
  return createMockPrintJob({
    name,
    user: { ...base.user, firstName, lastName },
  });
};

// jsdom applies no CSS, so the switch is checked through the classes that CSS acts on: the cards
// wrapper hides from md up, the table wrapper hides below it.
function expectCardsBelowMd() {
  expect(screen.getByRole('list').parentElement).toHaveClass('md:hidden');
  expect(screen.getByRole('table').closest('[class~="md:block"]')).toHaveClass('hidden');
}

describe('PrintJobsTable on a phone (admin)', () => {
  it('shows each job as a card with the user, print date and actions menu', async () => {
    const user = userEvent.setup();
    const jobs = [
      withUser('Alpha bracket', 'Jordan', 'Lee'),
      withUser('Zulu clip', 'Sam', 'Ortiz'),
    ];

    render(<PrintJobsTable printJobs={jobs} pagination={pagination} mode="admin" />);

    expectCardsBelowMd();
    const cards = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('User: Jordan Lee')).toBeInTheDocument();
    expect(within(cards[0]).getByText(/Print date:/)).toBeInTheDocument();

    const actions = within(cards[0]).getByRole('button', { name: 'Actions for Alpha bracket' });
    expect(actions).toHaveClass('h-11', 'w-11');

    await user.click(actions);
    expect(screen.getByRole('menuitem', { name: /change status/i })).toBeInTheDocument();
  });

  it('sorts the cards from the "Sort by" select', async () => {
    const user = userEvent.setup();
    const jobs = [
      withUser('Alpha bracket', 'Jordan', 'Lee'),
      withUser('Zulu clip', 'Sam', 'Ortiz'),
    ];

    render(<PrintJobsTable printJobs={jobs} pagination={pagination} mode="admin" />);

    const select = screen.getByLabelText('Sort by');
    await user.selectOptions(select, 'name:desc');

    expect(select).toHaveValue('name:desc');
    const names = within(screen.getByRole('list'))
      .getAllByRole('listitem')
      .map((item) => item.querySelector('.font-medium')?.textContent);
    expect(names).toEqual(['Zulu clip', 'Alpha bracket']);
  });
});
