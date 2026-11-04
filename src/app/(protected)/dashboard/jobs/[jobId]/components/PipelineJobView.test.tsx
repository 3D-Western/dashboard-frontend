import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@test/utils/render';
import { pipelineApi } from '@/api/client/pipeline';
import { createMockPlan, createMockSnapshot } from '@test/utils/pipelineFactories';
import { JobDetail } from '@/types/jobs';
import { PipelineJobView } from './PipelineJobView';
import { PipelineTimeline } from './PipelineTimeline';

vi.mock('@/api/client/pipeline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client/pipeline')>()),
  pipelineApi: {
    getState: vi.fn(),
    stream: vi.fn(),
    saveInputs: vi.fn(),
    confirm: vi.fn(),
    choose: vi.fn(),
    report: vi.fn(),
  },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const api = vi.mocked(pipelineApi);

// The legacy fields say "Queued, on Nov 1" while the job was only created on Nov 4: they must not show
const job: JobDetail = {
  id: 'job-9',
  name: 'Phone Stand',
  description: '',
  category: 'ThreeDPrint',
  user: { studentId: 251000001, firstName: 'Dev', lastName: 'User' },
  jobPlaced: '2026-11-04T15:00:00Z',
  dateSubmitted: '2026-11-04T15:00:00Z',
  files: [],
  status: 'InQueue',
  studentStatus: 'needs_confirmation',
  comments: '',
  filepath: 'uploads/stand.stl',
  formAnswersJson: '{}',
  statusHistory: [
    { status: 'InQueue', changedAt: '2026-11-01T10:00:00Z', comments: 'Job submitted' },
  ],
};

beforeEach(() => {
  api.getState.mockResolvedValue(
    createMockSnapshot({ studentStatus: 'needs_confirmation', plan: createMockPlan() }),
  );
  api.stream.mockImplementation(
    (_id, { signal }) =>
      new Promise<void>((resolve) => signal?.addEventListener('abort', () => resolve())),
  );
});

describe('PipelineTimeline', () => {
  const steps = () =>
    within(screen.getByRole('list'))
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '');

  it('follows studentStatus: created, preparing, then the review is the current step', () => {
    render(
      <PipelineTimeline studentStatus="needs_confirmation" createdAt="2026-11-04T15:00:00Z" />,
    );

    const items = steps();
    expect(
      items.map((t) =>
        t.replace(/\s*\(current step\).*/, '').replace(/Nov.*|Your .*message.*/, ''),
      ),
    ).toEqual(
      expect.arrayContaining(['Job created', 'Preparing', 'Your review', 'Queued', 'Printing']),
    );
    expect(items.find((t) => t.includes('(current step)'))).toMatch(/^Your review/);
    expect(items.some((t) => /Queued.*\(current step\)/.test(t))).toBe(false);
  });

  it('dates only the creation, with the real date, and invents no other', () => {
    render(<PipelineTimeline studentStatus="queued" createdAt="2026-11-04T15:00:00Z" />);

    expect(screen.getAllByText(/Nov \d/)).toHaveLength(1);
    expect(screen.getByText(/Nov 4/)).toBeInTheDocument();
  });

  it.each([
    ['preparing', 'Preparing'],
    ['needs_choice', 'Your review'],
    ['queued', 'Queued'],
    ['reprinting', 'Printing'],
    ['ready_for_pickup', 'Ready for pickup'],
  ] as const)('marks %s as "%s"', (status, label) => {
    render(<PipelineTimeline studentStatus={status} />);

    const current = steps().filter((t) => t.includes('(current step)'));
    expect(current).toHaveLength(1);
    expect(current[0]).toMatch(new RegExp(`^${label}`));
  });

  it('shows collected as finished, and ends early where a job stopped', () => {
    const { unmount } = render(<PipelineTimeline studentStatus="collected" />);
    expect(steps().some((t) => t.includes('(current step)'))).toBe(false);
    unmount();

    render(<PipelineTimeline studentStatus="cannot_print" />);
    expect(steps().map((t) => t.replace(/\s*\(current step\)/, ''))).toEqual([
      'Job created',
      'Preparing',
      expect.stringContaining("Can't print"),
    ]);
  });
});

describe('PipelineJobView', () => {
  it('words the header, the panel and the timeline by studentStatus, ignoring the legacy status', async () => {
    render(<PipelineJobView job={job} initialStatus="needs_confirmation" />);

    expect(await screen.findByRole('button', { name: 'Yes, print this' })).toBeInTheDocument();
    expect(screen.getAllByText('Review needed').length).toBeGreaterThan(0);
    const history = screen.getByRole('region', { name: 'Status history' });
    expect(within(history).getByText(/Nov 4/)).toBeInTheDocument();
    expect(within(history).queryByText(/Nov 1/)).not.toBeInTheDocument();
    expect(within(history).queryByText('Job submitted')).not.toBeInTheDocument();
    expect(within(history).getByText(/Your review/).textContent).toMatch(/current step/);
  });
});
