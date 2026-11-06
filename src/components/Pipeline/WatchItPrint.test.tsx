import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { LiveViewFrameError, pipelineApi } from '@/api/client/pipeline';
import type { LiveViewOffer } from '@/types/pipeline';
import { WatchItPrint } from './WatchItPrint';

vi.mock('@/api/client/pipeline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client/pipeline')>()),
  pipelineApi: { liveView: vi.fn(), liveViewFrame: vi.fn() },
}));

const api = vi.mocked(pipelineApi);
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const JOB = 'job-7';
const BASE = `/api/v1/jobs/${JOB}/pipeline/live-view`;

const offer = (overrides: Partial<LiveViewOffer> = {}): LiveViewOffer => ({
  available: true,
  snapshotUrl: `${BASE}/snapshot`,
  streamUrl: `${BASE}/stream`,
  snapshotIntervalS: 1,
  maxStreamS: 90,
  expiresAt: new Date(Date.now() + 120_000).toISOString(),
  ...overrides,
});

const picture = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
const openButton = () => screen.getByRole('button', { name: 'Watch it print' });
const setConnection = (connection: unknown) =>
  Object.defineProperty(navigator, 'connection', { value: connection, configurable: true });

beforeEach(() => {
  api.liveView.mockReset();
  api.liveViewFrame.mockReset();
  api.liveView.mockResolvedValue(offer());
  api.liveViewFrame.mockResolvedValue(picture());
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:picture-${++n}`);
  URL.revokeObjectURL = vi.fn();
  setConnection(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
});

describe('WatchItPrint', () => {
  it('shows only the button at first: nothing is asked and no video starts by itself', () => {
    render(<WatchItPrint jobId={JOB} />);

    expect(openButton()).toBeVisible();
    expect(screen.queryByTestId('watch-it-print')).not.toBeInTheDocument();
    expect(api.liveView).not.toHaveBeenCalled();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('opens the video from the backend’s own relay route when asked', async () => {
    const user = setup();
    render(<WatchItPrint jobId={JOB} />);

    await user.click(openButton());

    const video = await screen.findByRole('img', { name: /live video of your print/i });
    expect(video).toHaveAttribute('src', `${BASE}/stream`);
    expect(api.liveView).toHaveBeenCalledWith(JOB, expect.anything());
    expect(screen.getByRole('button', { name: 'Pause' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close' })).toBeVisible();
    expect(api.liveViewFrame).not.toHaveBeenCalled(); // the video is not also polled
  });

  it('words it for staff as this print, not your print', async () => {
    const user = setup();
    render(<WatchItPrint jobId={JOB} audience="staff" />);

    await user.click(openButton());

    expect(await screen.findByRole('img', { name: /live video of this print/i })).toBeVisible();
  });

  it('pauses: the video connection goes, the last picture stays, and it can resume', async () => {
    const user = setup();
    render(<WatchItPrint jobId={JOB} />);
    await user.click(openButton());
    await screen.findByRole('img', { name: /live video/i });

    await user.click(screen.getByRole('button', { name: 'Pause' }));

    expect(
      await screen.findByRole('img', { name: /latest picture of your print/i }),
    ).toHaveAttribute('src', 'blob:picture-1');
    expect(screen.queryByRole('img', { name: /live video/i })).not.toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Resume' }));
    expect(await screen.findByRole('img', { name: /live video/i })).toBeVisible();
  });

  it('closes back to the button and frees its picture', async () => {
    const user = setup();
    render(<WatchItPrint jobId={JOB} />);
    await user.click(openButton());
    await screen.findByRole('img', { name: /live video/i });
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await screen.findByRole('img', { name: /latest picture/i });

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(openButton()).toBeVisible();
    expect(screen.queryByTestId('watch-it-print')).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:picture-1');
  });

  describe('mobile data', () => {
    it.each([
      ['save-data is on', { saveData: true }],
      ['the connection is cellular', { type: 'cellular' }],
      ['the connection is 2g', { effectiveType: '2g' }],
    ])('does not start the video by itself when %s', async (_name, connection) => {
      setConnection(connection);
      const user = setup();
      render(<WatchItPrint jobId={JOB} />);

      await user.click(openButton());

      expect(await screen.findByText(/video is off to save your data/i)).toBeVisible();
      expect(screen.queryByRole('img', { name: /live video/i })).not.toBeInTheDocument();
      expect(await screen.findByRole('img', { name: /latest picture/i })).toBeVisible();
      expect(api.liveViewFrame).toHaveBeenCalledTimes(1); // one picture, not a stream of them
    });

    it('plays the video once the person asks for it', async () => {
      setConnection({ saveData: true });
      const user = setup();
      render(<WatchItPrint jobId={JOB} />);
      await user.click(openButton());

      await user.click(await screen.findByRole('button', { name: 'Play video' }));

      expect(await screen.findByRole('img', { name: /live video/i })).toHaveAttribute(
        'src',
        `${BASE}/stream`,
      );
    });
  });

  describe('when there is nothing to watch', () => {
    it.each([
      ['not_printing', /not on a printer right now/i],
      ['no_camera', /camera is not available/i],
      ['disabled', /not switched on/i],
    ])('says why for %s', async (reason, text) => {
      api.liveView.mockResolvedValue({ available: false, reason });
      const user = setup();
      render(<WatchItPrint jobId={JOB} />);

      await user.click(openButton());

      expect(await screen.findByText(text)).toBeVisible();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('says the print has finished on a 410 from the offer', async () => {
      api.liveView.mockRejectedValue(new ApiError('LIVE_VIEW_ENDED', 'The print has finished'));
      const user = setup();
      render(<WatchItPrint jobId={JOB} />);

      await user.click(openButton());

      expect(await screen.findByText(/the print has finished/i)).toBeVisible();
      expect(screen.getByTestId('watch-it-print')).toHaveAttribute('data-phase', 'ended');
    });

    it.each([
      ['FORBIDDEN', /only watch your own prints/i],
      ['RATE_LIMIT_EXCEEDED', /too many people/i],
      ['PIPELINE_UNAVAILABLE', /not available right now/i],
    ])('explains a %s', async (code, text) => {
      api.liveView.mockRejectedValue(new ApiError(code, 'x'));
      const user = setup();
      render(<WatchItPrint jobId={JOB} />);

      await user.click(openButton());

      expect(await screen.findByText(text)).toBeVisible();
    });

    it('offers to try again when the view is unavailable', async () => {
      api.liveView.mockRejectedValueOnce(new ApiError('PIPELINE_UNAVAILABLE', 'down'));
      const user = setup();
      render(<WatchItPrint jobId={JOB} />);
      await user.click(openButton());

      await user.click(await screen.findByRole('button', { name: 'Try again' }));

      expect(await screen.findByRole('img', { name: /live video/i })).toBeVisible();
    });
  });

  it('never loads a picture from an address the backend did not mean to give', async () => {
    api.liveView.mockResolvedValue(
      offer({
        streamUrl: 'https://camera.example/stream',
        snapshotUrl: `/api/v1/jobs/other/pipeline/live-view/snapshot`,
      }),
    );
    const user = setup();
    render(<WatchItPrint jobId={JOB} />);

    await user.click(openButton());

    expect(await screen.findByText(/camera view is not available/i)).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(api.liveViewFrame).not.toHaveBeenCalled();
  });

  describe('pictures instead of video', () => {
    const noStream = () => offer({ streamUrl: null });

    it('refreshes a picture every interval when the backend has no stream', async () => {
      api.liveView.mockResolvedValue(noStream());
      const user = setup();
      render(<WatchItPrint jobId={JOB} frameDelayMs={20} />);

      await user.click(openButton());

      await waitFor(() => expect(api.liveViewFrame.mock.calls.length).toBeGreaterThanOrEqual(2));
      expect(api.liveViewFrame).toHaveBeenCalledWith(`${BASE}/snapshot`, expect.anything());
      expect(screen.getByRole('img', { name: /latest picture/i })).toBeVisible();
      expect(screen.getByTestId('watch-it-print')).toHaveAttribute('data-phase', 'pictures');
    });

    it('falls back to pictures when the video will not play', async () => {
      const user = setup();
      render(<WatchItPrint jobId={JOB} frameDelayMs={20} />);
      await user.click(openButton());
      const video = await screen.findByRole('img', { name: /live video/i });

      fireEvent.error(video);

      await waitFor(() => expect(api.liveViewFrame).toHaveBeenCalled());
      expect(await screen.findByRole('img', { name: /latest picture/i })).toBeVisible();
    });

    it('says the print has finished when the video fails because the print ended', async () => {
      const user = setup();
      render(<WatchItPrint jobId={JOB} />);
      await user.click(openButton());
      const video = await screen.findByRole('img', { name: /live video/i });
      api.liveView.mockResolvedValue({ available: false, reason: 'not_printing' });

      fireEvent.error(video);

      expect(await screen.findByText(/the print has finished/i)).toBeVisible();
      expect(screen.getByTestId('watch-it-print')).toHaveAttribute('data-phase', 'ended');
    });

    it('ends with "the print has finished" on a 410 picture', async () => {
      api.liveView.mockResolvedValue(noStream());
      api.liveViewFrame
        .mockResolvedValueOnce(picture())
        .mockRejectedValue(new LiveViewFrameError('ended'));
      const user = setup();
      render(<WatchItPrint jobId={JOB} frameDelayMs={20} />);

      await user.click(openButton());

      expect(await screen.findByText(/the print has finished/i)).toBeVisible();
      expect(screen.getByTestId('watch-it-print')).toHaveAttribute('data-phase', 'ended');
    });

    it('gives up after several failed pictures in a row, and slows down when asked too often', async () => {
      api.liveView.mockResolvedValue(noStream());
      api.liveViewFrame.mockRejectedValue(new LiveViewFrameError('unavailable'));
      const user = setup();
      render(<WatchItPrint jobId={JOB} frameDelayMs={5} />);

      await user.click(openButton());

      expect(await screen.findByText(/not giving a picture right now/i)).toBeVisible();
      expect(api.liveViewFrame).toHaveBeenCalledTimes(4);
    });

    it('tells a student who is not allowed that it is their own prints only', async () => {
      api.liveView.mockResolvedValue(noStream());
      api.liveViewFrame.mockRejectedValue(new LiveViewFrameError('forbidden'));
      const user = setup();
      render(<WatchItPrint jobId={JOB} />);

      await user.click(openButton());

      expect(await screen.findByText(/only watch your own prints/i)).toBeVisible();
    });
  });

  it('pauses itself when its allowed length is up, and asks to go on', async () => {
    const user = setup();
    render(<WatchItPrint jobId={JOB} streamSeconds={0.05} />);
    await user.click(openButton());
    await screen.findByRole('img', { name: /live video/i });

    expect(await screen.findByText(/video stopped after a while/i)).toBeVisible();
    expect(screen.queryByRole('img', { name: /live video/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeVisible();
  });

  it('pauses when the tab is hidden', async () => {
    const user = setup();
    render(<WatchItPrint jobId={JOB} />);
    await user.click(openButton());
    await screen.findByRole('img', { name: /live video/i });

    await act(async () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(await screen.findByText(/paused while this page was hidden/i)).toBeVisible();
    expect(screen.queryByRole('img', { name: /live video/i })).not.toBeInTheDocument();
  });

  it('does not touch the view after it is taken off the page', async () => {
    api.liveView.mockResolvedValue(offer({ streamUrl: null }));
    const user = setup();
    const { unmount } = render(<WatchItPrint jobId={JOB} frameDelayMs={20} />);
    await user.click(openButton());
    await waitFor(() => expect(api.liveViewFrame).toHaveBeenCalled());

    unmount();
    const calls = api.liveViewFrame.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(api.liveViewFrame.mock.calls.length).toBeLessThanOrEqual(calls + 1);
    expect(within(document.body).queryByTestId('watch-it-print')).not.toBeInTheDocument();
  });
});
