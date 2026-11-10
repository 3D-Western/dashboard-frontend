import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { pipelineApi } from '@/api/client/pipeline';
import { createMockSnapshot } from '@test/utils/pipelineFactories';
import { RatingRequiredPrompt } from './RatingRequiredPrompt';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/api/client/pipeline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client/pipeline')>()),
  pipelineApi: { rate: vi.fn(), reportQuality: vi.fn() },
}));

const api = vi.mocked(pipelineApi);
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const prints = [
  { jobId: 'a', name: 'Hinge Pair', collectedAt: '2026-11-01T10:00:00Z' },
  { jobId: 'b', name: 'Cable Clip', collectedAt: '2026-11-02T10:00:00Z' },
];

beforeEach(() => {
  window.localStorage.clear();
  api.rate.mockReset().mockResolvedValue(createMockSnapshot());
  api.reportQuality.mockReset().mockResolvedValue(createMockSnapshot());
});

describe('RatingRequiredPrompt', () => {
  it('asks about one print at a time, oldest first, and carries on after the last', async () => {
    const onDone = vi.fn();
    render(<RatingRequiredPrompt prints={prints} onDone={onDone} />);
    const user = setup();

    expect(screen.getByRole('heading', { name: /how did hinge pair turn out/i })).toBeVisible();
    expect(screen.getByText(/1 of 2/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Good' }));
    expect(api.rate).toHaveBeenLastCalledWith('a', 'up');
    expect(onDone).not.toHaveBeenCalled();

    expect(
      await screen.findByRole('heading', { name: /how did cable clip turn out/i }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Good' }));
    expect(api.rate).toHaveBeenLastCalledWith('b', 'up');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('after a thumbs-down asks what was off, with no way to skip it', async () => {
    const onDone = vi.fn();
    render(<RatingRequiredPrompt prints={[prints[0]]} onDone={onDone} />);
    const user = setup();

    await user.click(screen.getByRole('button', { name: 'Not great' }));
    expect(await screen.findByText(/tap what was off, then you can go on/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /no thanks|skip/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('has no way past the question without a saved rating: a failed save keeps asking, Escape does nothing', async () => {
    api.rate.mockRejectedValue(new Error('offline'));
    const onDone = vi.fn();
    render(<RatingRequiredPrompt prints={[prints[0]]} onDone={onDone} />);
    const user = setup();

    await user.click(screen.getByRole('button', { name: 'Not great' }));
    await user.keyboard('{Escape}');

    expect(await screen.findByRole('button', { name: 'Not great' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Skip this step' })).not.toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('sends the quality report for the print that was rated down, then carries on', async () => {
    const onDone = vi.fn();
    render(<RatingRequiredPrompt prints={[prints[0]]} onDone={onDone} />);
    const user = setup();

    await user.click(screen.getByRole('button', { name: 'Not great' }));
    await user.click(await screen.findByRole('button', { name: 'Weak or brittle' }));
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(api.reportQuality).toHaveBeenCalledWith('a', { reasons: ['weak'], text: '' });
  });

  it('stays put, with the buttons back, when a rating cannot be saved', async () => {
    api.rate.mockRejectedValue(new Error('offline'));
    const onDone = vi.fn();
    render(<RatingRequiredPrompt prints={[prints[0]]} onDone={onDone} />);

    await setup().click(screen.getByRole('button', { name: 'Good' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Good' })).toBeEnabled());
    expect(onDone).not.toHaveBeenCalled();
  });

  it('has nothing to skip to: there is no skip button', () => {
    render(<RatingRequiredPrompt prints={prints} onDone={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /skip|not now/i })).not.toBeInTheDocument();
  });
});
