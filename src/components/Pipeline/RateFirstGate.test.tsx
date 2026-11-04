import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { pipelineApi } from '@/api/client/pipeline';
import { userApi } from '@/api/client/user';
import { RateFirstGate } from './RateFirstGate';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/api/client/user', () => ({ userApi: { getCurrentUserJobs: vi.fn() } }));
vi.mock('@/api/client/pipeline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client/pipeline')>()),
  pipelineApi: { rate: vi.fn(), reportQuality: vi.fn() },
}));

const jobs = vi.mocked(userApi.getCurrentUserJobs);
const api = vi.mocked(pipelineApi);
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });

const unrated = (overrides = {}) => ({
  id: 'job-3',
  name: 'Hinge Pair',
  studentStatus: 'collected',
  rated: false,
  jobPlaced: '2026-11-01T10:00:00Z',
  ...overrides,
});
const listOf = (...data: unknown[]) => ({ data, pagination: {} }) as never;

const Upload = () => <div>the upload screen</div>;

beforeEach(() => {
  window.localStorage.clear();
  jobs.mockReset();
  api.rate.mockReset().mockResolvedValue({});
  api.reportQuality.mockReset().mockResolvedValue(undefined);
});

describe('RateFirstGate', () => {
  it('opens the upload straight away when nothing needs rating', async () => {
    jobs.mockResolvedValue(
      listOf(unrated({ rated: true }), unrated({ id: 'x', rated: undefined })),
    );
    render(
      <RateFirstGate>
        <Upload />
      </RateFirstGate>,
    );

    expect(await screen.findByText('the upload screen')).toBeVisible();
    expect(screen.queryByTestId('rate-first')).not.toBeInTheDocument();
  });

  it('asks for one tap about the unrated print first, then continues straight to the upload', async () => {
    jobs.mockResolvedValue(listOf(unrated()));
    render(
      <RateFirstGate>
        <Upload />
      </RateFirstGate>,
    );

    expect(
      await screen.findByRole('heading', { name: /how did hinge pair turn out/i }),
    ).toBeVisible();
    expect(screen.queryByText('the upload screen')).not.toBeInTheDocument();

    await setup().click(screen.getByRole('button', { name: 'Good' }));

    expect(api.rate).toHaveBeenCalledWith('job-3', 'up');
    expect(await screen.findByText('the upload screen')).toBeVisible();
  });

  it('after a thumbs-down offers the quality step, and skipping it continues to the upload', async () => {
    jobs.mockResolvedValue(listOf(unrated()));
    render(
      <RateFirstGate>
        <Upload />
      </RateFirstGate>,
    );
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Not great' }));
    expect(await screen.findByText(/help improve our system for everyone/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'No thanks' }));

    expect(api.reportQuality).not.toHaveBeenCalled();
    expect(await screen.findByText('the upload screen')).toBeVisible();
  });

  it('can be skipped when the backend does not require it, and is then left alone for a day', async () => {
    jobs.mockResolvedValue(listOf(unrated()));
    const first = render(
      <RateFirstGate>
        <Upload />
      </RateFirstGate>,
    );

    await setup().click(await screen.findByRole('button', { name: 'Skip for now' }));
    expect(await screen.findByText('the upload screen')).toBeVisible();
    expect(api.rate).not.toHaveBeenCalled();
    first.unmount();

    render(
      <RateFirstGate>
        <Upload />
      </RateFirstGate>,
    );
    expect(await screen.findByText('the upload screen')).toBeVisible();
    expect(screen.queryByTestId('rate-first')).not.toBeInTheDocument();
  });

  it('has no way past it when the backend requires the rating', async () => {
    jobs.mockResolvedValue(listOf(unrated({ ratingRequired: true })));
    render(
      <RateFirstGate>
        <Upload />
      </RateFirstGate>,
    );

    expect(await screen.findByTestId('rate-first')).toHaveAttribute('data-required', 'true');
    expect(screen.queryByRole('button', { name: 'Skip for now' })).not.toBeInTheDocument();
    expect(screen.queryByText('the upload screen')).not.toBeInTheDocument();
  });

  it('never blocks on its own failure: an error from the check opens the upload', async () => {
    jobs.mockRejectedValue(new Error('offline'));
    render(
      <RateFirstGate>
        <Upload />
      </RateFirstGate>,
    );

    expect(await screen.findByText('the upload screen')).toBeVisible();
  });

  it('opens the upload when the check is too slow', async () => {
    vi.useFakeTimers();
    try {
      jobs.mockReturnValue(new Promise(() => {}));
      render(
        <RateFirstGate timeoutMs={1000}>
          <Upload />
        </RateFirstGate>,
      );
      expect(screen.queryByText('the upload screen')).not.toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(screen.getByText('the upload screen')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the buttons when saving fails, so the student can tap again', async () => {
    jobs.mockResolvedValue(listOf(unrated()));
    api.rate.mockRejectedValueOnce(new Error('offline'));
    render(
      <RateFirstGate>
        <Upload />
      </RateFirstGate>,
    );
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Good' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Good' })).toBeEnabled());
    expect(screen.queryByText('the upload screen')).not.toBeInTheDocument();
  });
});
