import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { pipelineReviewApi } from '@/api/client/pipeline-review';
import {
  createQueueItem,
  createQueueResponse,
  createReportQueueItem,
  createSubmission,
} from '@test/utils/pipelineReviewFactories';
import { ReviewQueue } from './ReviewQueue';

vi.mock('@/api/client/pipeline-review', () => ({
  pipelineReviewApi: {
    queue: vi.fn(),
    submissions: vi.fn(),
    health: vi.fn(),
    requeue: vi.fn(),
    resolveReport: vi.fn(),
  },
}));

const api = pipelineReviewApi as unknown as Record<
  'queue' | 'submissions' | 'health' | 'requeue',
  Mock
>;
const NOW = new Date('2026-11-04T09:00:00Z');
const A = '11111111-1111-4111-8111-00000000000a';
const B = '11111111-1111-4111-8111-00000000000b';

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
  api.submissions.mockResolvedValue([]);
  api.health.mockResolvedValue({ status: 'ok', consecutiveFailures: 0, activeAlertSinks: [] });
});
afterEach(() => vi.useRealTimers());

describe('ReviewQueue', () => {
  it('lists jobs and reports oldest first with a count per status', async () => {
    api.queue.mockResolvedValue(
      createQueueResponse({
        items: [
          createReportQueueItem({ reportId: 4, since: '2026-11-03T20:00:00Z' }),
          createQueueItem({
            jobId: A,
            jobName: 'Newer',
            staffStatus: 'escalated',
            since: '2026-11-04T08:00:00Z',
          }),
          createQueueItem({
            jobId: B,
            jobName: 'Oldest',
            staffStatus: 'held',
            since: '2026-11-02T08:00:00Z',
          }),
        ],
        counts: { held: 3, escalated: 1, silent_review: 2 },
        openReports: 5,
      }),
    );
    render(<ReviewQueue now={NOW} refreshMs={0} />);

    await screen.findByText('Oldest');
    const order = screen
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '')
      .filter((t) => /Oldest|Newer|check the thin walls/.test(t));
    expect(order[0]).toMatch(/Oldest/);
    expect(order[1]).toMatch(/thin walls/);
    expect(order[2]).toMatch(/Newer/);

    const filters = screen.getByRole('group', { name: /filter/i });
    expect(within(filters).getByRole('button', { name: /^Held 3$/ })).toBeInTheDocument();
    expect(within(filters).getByRole('button', { name: /^Silent review 2$/ })).toBeInTheDocument();
    expect(
      within(filters).getByRole('button', { name: /^Problem reports 5$/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Oldest/ })).toHaveAttribute(
      'href',
      `/admin/review/${B}`,
    );
  });

  it('asks the backend for only the chosen statuses', async () => {
    api.queue.mockResolvedValue(createQueueResponse());
    const user = userEvent.setup();
    render(<ReviewQueue now={NOW} refreshMs={0} />);
    await screen.findByText('Bracket v3');
    expect(api.queue).toHaveBeenLastCalledWith({});

    await user.click(screen.getByRole('button', { name: /^Escalated/ }));
    await waitFor(() =>
      expect(api.queue).toHaveBeenLastCalledWith({ status: ['escalated'], reports: false }),
    );

    await user.click(screen.getByRole('button', { name: /^Problem reports/ }));
    await waitFor(() =>
      expect(api.queue).toHaveBeenLastCalledWith({ status: ['escalated'], reports: true }),
    );
  });

  it('refreshes by itself', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.queue.mockResolvedValue(createQueueResponse());
    render(<ReviewQueue now={NOW} refreshMs={15_000} />);
    await screen.findByText('Bracket v3');
    const first = api.queue.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_100);
    });
    expect(api.queue.mock.calls.length).toBeGreaterThan(first);
  });

  it('puts a FAILED submission back with the requeue button', async () => {
    api.queue.mockResolvedValue(createQueueResponse());
    api.submissions.mockResolvedValue([
      createSubmission({ jobId: A, lastError: 'file too large' }),
    ]);
    api.requeue.mockResolvedValue(createSubmission({ jobId: A, status: 'PENDING' }));
    const user = userEvent.setup();
    render(<ReviewQueue now={NOW} refreshMs={0} />);

    expect(await screen.findByText(/file too large/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Requeue' }));

    await waitFor(() => expect(api.requeue).toHaveBeenCalledWith(A));
  });

  it('warns when the pipeline is down and lists decisions that never arrived', async () => {
    api.health.mockResolvedValue({
      status: 'down',
      consecutiveFailures: 9,
      lastError: 'connection refused',
      activeAlertSinks: [],
    });
    api.queue.mockResolvedValue(
      createQueueResponse({
        failedDecisions: [
          {
            jobId: A,
            actionId: 'x',
            decision: 'reject',
            error: 'gave up',
            createdAt: '2026-11-04T08:00:00Z',
          },
        ],
      }),
    );
    render(<ReviewQueue now={NOW} refreshMs={0} />);

    expect(await screen.findByText('The pipeline is down')).toBeInTheDocument();
    expect(screen.getByText(/never reached the pipeline/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Job 11111111$/ })).toBeInTheDocument();
  });
});
