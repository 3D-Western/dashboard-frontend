import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { trainingAPI } from '@/api/client/training';
import {
  createCheckpoint,
  createQuestion,
  createVideoBlock,
  createVideoStep,
} from '@test/utils/trainingFactories';
import type { AttemptStep, HeartbeatResult } from '@/types/training';
import { HEARTBEAT_INTERVAL_MS, VideoStep } from './VideoStep';

vi.mock('@/api/client/training', () => ({
  trainingAPI: {
    getPlaybackUrl: vi.fn(),
    sendHeartbeat: vi.fn(),
    answerCheckpoint: vi.fn(),
  },
}));

const api = trainingAPI as unknown as {
  getPlaybackUrl: Mock;
  sendHeartbeat: Mock;
  answerCheckpoint: Mock;
};

const heartbeatResult = (overrides: Partial<HeartbeatResult> = {}): HeartbeatResult => ({
  watchedPercent: 10,
  creditedSeconds: 12,
  capped: false,
  stepCompleted: false,
  checkpointsRemaining: [],
  ...overrides,
});

const inAnHour = () => new Date(Date.now() + 60 * 60_000).toISOString();

/** happy-dom does not play media, so the element's state is driven from the test. */
function controlVideo(video: HTMLVideoElement, initial: { duration?: number } = {}) {
  const state = {
    paused: true,
    ended: false,
    seeking: false,
    currentTime: 0,
    duration: initial.duration ?? 120,
    playbackRate: 1,
  };
  for (const key of ['paused', 'ended', 'seeking', 'duration'] as const) {
    Object.defineProperty(video, key, { configurable: true, get: () => state[key] });
  }
  Object.defineProperty(video, 'currentTime', {
    configurable: true,
    get: () => state.currentTime,
    set: (value: number) => {
      state.currentTime = value;
    },
  });
  Object.defineProperty(video, 'playbackRate', {
    configurable: true,
    get: () => state.playbackRate,
    set: (value: number) => {
      state.playbackRate = value;
    },
  });
  const play = vi.fn(() => {
    state.paused = false;
    fireEvent.play(video);
    return Promise.resolve();
  });
  const pause = vi.fn(() => {
    state.paused = true;
    fireEvent.pause(video);
  });
  video.play = play;
  video.pause = pause;

  /** Plays up to [seconds] in steps of one second, as the browser would. */
  const playTo = (seconds: number) => {
    if (state.paused) video.play();
    for (let t = Math.floor(state.currentTime) + 1; t <= seconds; t++) {
      state.currentTime = t;
      fireEvent.timeUpdate(video);
      if (state.paused) break; // a checkpoint paused it
    }
  };
  return { state, play, pause, playTo };
}

async function setup(step: AttemptStep = createVideoStep(), onStepCompleted = vi.fn()) {
  render(<VideoStep attemptId={1} step={step} onStepCompleted={onStepCompleted} />);
  const video = (await screen.findByLabelText(step.title)) as HTMLVideoElement;
  const control = controlVideo(video);
  return { video, ...control, onStepCompleted };
}

beforeEach(() => {
  api.getPlaybackUrl.mockResolvedValue({
    url: 'https://video.test/a.mp4',
    expiresAt: inAnHour(),
    durationSeconds: 120,
  });
  api.sendHeartbeat.mockResolvedValue(heartbeatResult());
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('VideoStep', () => {
  it('asks for a playback URL first and plays inline (iOS Safari)', async () => {
    const { video } = await setup();

    expect(api.getPlaybackUrl).toHaveBeenCalledWith(1, 7);
    expect(video).toHaveAttribute('src', 'https://video.test/a.mp4');
    expect(video).toHaveAttribute('playsinline');
    expect(video).not.toHaveAttribute('controls');
    // Picture-in-picture would keep playing while the tab is out of focus
    expect(video).toHaveAttribute('disablepictureinpicture');
  });

  it('shows how much has been watched and what is required', async () => {
    await setup(
      createVideoStep({ video: createVideoBlock({ watchedPercent: 42, minWatchPercent: 90 }) }),
    );

    expect(screen.getByRole('progressbar', { name: /video watched/i })).toHaveAttribute(
      'aria-valuenow',
      '42',
    );
    expect(screen.getByText(/watch at least 90%/i)).toBeInTheDocument();
  });

  it('shows a plain message when the playback URL cannot be fetched', async () => {
    const { ApiError } = await import('@/api/client/errors');
    api.getPlaybackUrl.mockRejectedValueOnce(new ApiError('VIDEO_NOT_CONFIGURED'));

    render(<VideoStep attemptId={1} step={createVideoStep()} onStepCompleted={vi.fn()} />);

    expect(await screen.findByText(/video isn't ready yet/i)).toBeInTheDocument();
  });

  describe('speed', () => {
    it('offers any playback speed', async () => {
      const { video, state } = await setup();
      const select = screen.getByLabelText(/playback speed/i);

      await userEvent.selectOptions(select, '4');

      expect(state.playbackRate).toBe(4);
      expect(video.playbackRate).toBe(4);
      expect(screen.getByRole('option', { name: '0.5x' })).toBeInTheDocument();
    });
  });

  describe('seeking', () => {
    const watched30 = createVideoStep({
      video: createVideoBlock({ watchedRanges: [{ start: 0, end: 30 }], watchedPercent: 25 }),
    });

    it('blocks seeking forward past the furthest watched point', async () => {
      const { video, state } = await setup(watched30);

      state.currentTime = 90;
      fireEvent.seeking(video);

      expect(state.currentTime).toBe(30);
      expect(screen.getByText(/can't skip ahead/i)).toBeInTheDocument();
    });

    it('allows seeking backwards freely', async () => {
      const { video, state } = await setup(watched30);

      state.currentTime = 10;
      fireEvent.seeking(video);

      expect(state.currentTime).toBe(10);
      expect(screen.queryByText(/can't skip ahead/i)).not.toBeInTheDocument();
    });

    it('allows seeking forward up to the watched point', async () => {
      const { video, state } = await setup(watched30);

      state.currentTime = 29;
      fireEvent.seeking(video);

      expect(state.currentTime).toBe(29);
    });

    it('applies the same limit to the position slider', async () => {
      const { state } = await setup(watched30);

      fireEvent.change(screen.getByRole('slider', { name: /video position/i }), {
        target: { value: '100' },
      });
      expect(state.currentTime).toBe(30);
      expect(screen.getByText(/can't skip ahead/i)).toBeInTheDocument();

      fireEvent.change(screen.getByRole('slider', { name: /video position/i }), {
        target: { value: '12' },
      });
      expect(state.currentTime).toBe(12);
    });

    it('extends the allowed point as the learner watches', async () => {
      const { video, state, playTo } = await setup();

      playTo(40);
      state.currentTime = 41;
      fireEvent.seeking(video);

      expect(state.currentTime).toBe(41);
    });

    it('never allows seeking past a question that has not been answered', async () => {
      const step = createVideoStep({
        video: createVideoBlock({
          watchedRanges: [{ start: 0, end: 100 }],
          checkpoints: [createCheckpoint({ atSeconds: 20 })],
        }),
      });
      const { video, state } = await setup(step);

      state.currentTime = 60;
      fireEvent.seeking(video);

      expect(state.currentTime).toBe(20);
    });
  });

  describe('losing focus', () => {
    it('pauses when the window loses focus and says why', async () => {
      const { pause, playTo } = await setup();
      playTo(3);
      pause.mockClear();

      fireEvent.blur(window);

      expect(pause).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/paused because you switched away/i)).toBeInTheDocument();
    });

    it('pauses when the tab is hidden', async () => {
      const { pause, playTo } = await setup();
      playTo(3);
      pause.mockClear();

      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      fireEvent(document, new Event('visibilitychange'));
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });

      expect(pause).toHaveBeenCalledTimes(1);
    });

    it('counts one episode once even when blur and visibilitychange both fire', async () => {
      const { playTo } = await setup();
      playTo(3);

      fireEvent.blur(window);
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      fireEvent(document, new Event('visibilitychange'));
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });

      await waitFor(() => expect(api.sendHeartbeat).toHaveBeenCalled());
      expect(api.sendHeartbeat.mock.calls[0][2].focusLossCount).toBe(1);
    });

    it('sends the focus-loss count with the next heartbeat, then starts again from zero', async () => {
      const { playTo } = await setup();
      playTo(3);
      fireEvent.blur(window);
      await waitFor(() => expect(api.sendHeartbeat).toHaveBeenCalledTimes(1));
      expect(api.sendHeartbeat.mock.calls[0][2].focusLossCount).toBe(1);

      // back in the tab, watch some more, leave again
      fireEvent.focus(window);
      playTo(6);
      fireEvent.blur(window);

      await waitFor(() => expect(api.sendHeartbeat).toHaveBeenCalledTimes(2));
      expect(api.sendHeartbeat.mock.calls[1][2].focusLossCount).toBe(1);
    });

    it('does not count leaving while the video is paused', async () => {
      const { pause } = await setup();

      fireEvent.blur(window);

      expect(pause).not.toHaveBeenCalled();
      expect(screen.queryByText(/paused because you switched away/i)).not.toBeInTheDocument();
      expect(api.sendHeartbeat).not.toHaveBeenCalled();
    });

    it('keeps the count if the heartbeat fails, and sends it next time', async () => {
      api.sendHeartbeat.mockRejectedValueOnce(new Error('offline'));
      const { playTo } = await setup();
      playTo(3);
      fireEvent.blur(window);
      await waitFor(() => expect(api.sendHeartbeat).toHaveBeenCalledTimes(1));

      fireEvent.focus(window);
      playTo(5);
      fireEvent.pause(screen.getByLabelText('Welcome video'));

      await waitFor(() => expect(api.sendHeartbeat).toHaveBeenCalledTimes(2));
      expect(api.sendHeartbeat.mock.calls[1][2].focusLossCount).toBe(1);
    });
  });

  describe('heartbeat', () => {
    it('reports the played ranges and focus-loss count about every 10 seconds', async () => {
      const { playTo } = await setup();
      vi.useFakeTimers();

      playTo(5);
      expect(api.sendHeartbeat).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS);
      });

      expect(api.sendHeartbeat).toHaveBeenCalledTimes(1);
      expect(api.sendHeartbeat).toHaveBeenCalledWith(1, 7, {
        ranges: [{ start: 1, end: 5 }],
        focusLossCount: 0,
      });
    });

    it('sends a heartbeat on pause', async () => {
      const { video, playTo } = await setup();
      playTo(4);

      fireEvent.pause(video);

      await waitFor(() => expect(api.sendHeartbeat).toHaveBeenCalledTimes(1));
      expect(api.sendHeartbeat.mock.calls[0][2]).toEqual({
        ranges: [{ start: 1, end: 4 }],
        focusLossCount: 0,
      });
    });

    it('sends a heartbeat when the video ends', async () => {
      const { video, state, playTo } = await setup();
      playTo(6);
      state.ended = true;

      fireEvent.ended(video);

      await waitFor(() => expect(api.sendHeartbeat).toHaveBeenCalled());
      const last = api.sendHeartbeat.mock.calls.at(-1)![2];
      expect(last.ranges).toEqual([{ start: 1, end: 6 }]);
    });

    it('sends cumulative ranges: later heartbeats include what was already reported', async () => {
      const { video, playTo } = await setup();
      playTo(4);
      fireEvent.pause(video);
      await waitFor(() => expect(api.sendHeartbeat).toHaveBeenCalledTimes(1));

      playTo(8);
      fireEvent.pause(video);

      await waitFor(() => expect(api.sendHeartbeat).toHaveBeenCalledTimes(2));
      // (the test clock jumps a second after the pause, so playing on starts a new range)
      expect(api.sendHeartbeat.mock.calls[1][2].ranges).toEqual([
        { start: 1, end: 4 },
        { start: 5, end: 8 },
      ]);
    });

    it('does not repeat a heartbeat when nothing new was watched', async () => {
      const { video, playTo } = await setup();
      playTo(4);
      fireEvent.pause(video);
      await waitFor(() => expect(api.sendHeartbeat).toHaveBeenCalledTimes(1));

      fireEvent.pause(video);

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(api.sendHeartbeat).toHaveBeenCalledTimes(1);
    });

    it('updates the watched percentage from the server', async () => {
      api.sendHeartbeat.mockResolvedValue(heartbeatResult({ watchedPercent: 55 }));
      const { video, playTo } = await setup();
      playTo(4);

      fireEvent.pause(video);

      await waitFor(() =>
        expect(screen.getByRole('progressbar', { name: /video watched/i })).toHaveAttribute(
          'aria-valuenow',
          '55',
        ),
      );
    });

    it('tells the player when the server says the step is complete', async () => {
      api.sendHeartbeat.mockResolvedValue(
        heartbeatResult({ stepCompleted: true, watchedPercent: 100 }),
      );
      const { video, playTo, onStepCompleted } = await setup();
      playTo(4);

      fireEvent.pause(video);

      await waitFor(() => expect(onStepCompleted).toHaveBeenCalledTimes(1));
    });

    it('tries again later when the server could not credit everything yet (capped)', async () => {
      api.sendHeartbeat
        .mockResolvedValueOnce(heartbeatResult({ capped: true }))
        .mockResolvedValue(heartbeatResult({ stepCompleted: true }));
      const { video, playTo, onStepCompleted } = await setup();
      playTo(4);
      vi.useFakeTimers();

      await act(async () => {
        fireEvent.pause(video);
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(api.sendHeartbeat).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(api.sendHeartbeat).toHaveBeenCalledTimes(2);
      expect(onStepCompleted).toHaveBeenCalled();
    });
  });

  describe('questions during the video', () => {
    const checkpointStep = () =>
      createVideoStep({
        video: createVideoBlock({
          checkpoints: [
            createCheckpoint({
              checkpointId: 11,
              atSeconds: 20,
              question: createQuestion({
                questionVersionId: 601,
                promptMarkdown: 'What did the video just show?',
              }),
            }),
          ],
        }),
      });

    beforeEach(() => {
      // The server still lists the question as open until it is answered correctly
      api.sendHeartbeat.mockResolvedValue(heartbeatResult({ checkpointsRemaining: [11] }));
    });

    it('pauses at the checkpoint and asks the question', async () => {
      const { pause, playTo } = await setup(checkpointStep());

      playTo(20);

      expect(pause).toHaveBeenCalled();
      expect(screen.getByText('What did the video just show?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /check my answer/i })).toBeDisabled();
      // Playing is not possible until it is answered
      expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
    });

    it('replays from rewatchFromSeconds after a wrong answer, then asks again', async () => {
      api.answerCheckpoint.mockResolvedValueOnce({
        correct: false,
        rewatchFromSeconds: 5,
        stepCompleted: false,
      });
      const { state, play, playTo } = await setup(checkpointStep());
      playTo(20);
      play.mockClear();

      await userEvent.click(screen.getByLabelText('On the front panel'));
      await userEvent.click(screen.getByRole('button', { name: /check my answer/i }));

      await waitFor(() => expect(state.currentTime).toBe(5));
      expect(api.answerCheckpoint).toHaveBeenCalledWith(1, 7, 11, [1]);
      expect(play).toHaveBeenCalled();
      expect(screen.getByText(/wasn't right/i)).toBeInTheDocument();
      expect(screen.queryByText('What did the video just show?')).not.toBeInTheDocument();

      // Watching on to the checkpoint again brings the question back, with no option picked
      playTo(20);
      expect(await screen.findByText('What did the video just show?')).toBeInTheDocument();
      expect(screen.getByLabelText('On the front panel')).not.toBeChecked();
    });

    it('replays from the start when the server gives no earlier point', async () => {
      api.answerCheckpoint.mockResolvedValueOnce({
        correct: false,
        rewatchFromSeconds: null,
        stepCompleted: false,
      });
      const { state, playTo } = await setup(checkpointStep());
      playTo(20);

      await userEvent.click(screen.getByLabelText('Behind the machine'));
      await userEvent.click(screen.getByRole('button', { name: /check my answer/i }));

      await waitFor(() => expect(state.currentTime).toBe(0));
    });

    it('carries on playing after a right answer and does not ask again', async () => {
      api.answerCheckpoint.mockResolvedValueOnce({
        correct: true,
        rewatchFromSeconds: null,
        stepCompleted: false,
      });
      const { play, playTo } = await setup(checkpointStep());
      playTo(20);
      play.mockClear();

      await userEvent.click(screen.getByLabelText('On the front panel'));
      await userEvent.click(screen.getByRole('button', { name: /check my answer/i }));

      await waitFor(() => expect(play).toHaveBeenCalled());
      expect(screen.queryByText('What did the video just show?')).not.toBeInTheDocument();
      playTo(25);
      expect(screen.queryByText('What did the video just show?')).not.toBeInTheDocument();
    });

    it('finishes the step when the last question is answered right', async () => {
      api.answerCheckpoint.mockResolvedValueOnce({
        correct: true,
        rewatchFromSeconds: null,
        stepCompleted: true,
      });
      const { playTo, onStepCompleted } = await setup(checkpointStep());
      playTo(20);

      await userEvent.click(screen.getByLabelText('On the front panel'));
      await userEvent.click(screen.getByRole('button', { name: /check my answer/i }));

      await waitFor(() => expect(onStepCompleted).toHaveBeenCalledTimes(1));
    });

    it('does not ask a question that was already answered correctly', async () => {
      const step = createVideoStep({
        video: createVideoBlock({ checkpoints: [createCheckpoint({ passed: true })] }),
      });
      const { playTo } = await setup(step);

      playTo(30);

      expect(screen.queryByText('What did the video just show?')).not.toBeInTheDocument();
    });

    it('asks a question placed at the very end when the video ends', async () => {
      const step = createVideoStep({
        video: createVideoBlock({ checkpoints: [createCheckpoint({ atSeconds: 120 })] }),
      });
      const { video, state } = await setup(step);
      state.currentTime = 119.9;
      state.paused = false;
      state.ended = true;

      fireEvent.ended(video);

      expect(await screen.findByText('What did the video just show?')).toBeInTheDocument();
    });

    it('shows a plain message if the answer cannot be checked', async () => {
      const { ApiError } = await import('@/api/client/errors');
      api.answerCheckpoint.mockRejectedValueOnce(new ApiError('STEP_LOCKED'));
      const { playTo } = await setup(checkpointStep());
      playTo(20);

      await userEvent.click(screen.getByLabelText('On the front panel'));
      await userEvent.click(screen.getByRole('button', { name: /check my answer/i }));

      expect(await screen.findByText(/finish the earlier steps first/i)).toBeInTheDocument();
    });
  });

  describe('expired video links', () => {
    it('gets a fresh URL before playing when the current one is about to expire', async () => {
      api.getPlaybackUrl
        .mockResolvedValueOnce({
          url: 'https://video.test/old.mp4',
          expiresAt: new Date(Date.now() + 10_000).toISOString(),
          durationSeconds: 120,
        })
        .mockResolvedValueOnce({
          url: 'https://video.test/new.mp4',
          expiresAt: inAnHour(),
          durationSeconds: 120,
        });
      const { video, state, play } = await setup();
      state.currentTime = 40;

      await userEvent.click(screen.getByRole('button', { name: 'Play' }));

      await waitFor(() => expect(video).toHaveAttribute('src', 'https://video.test/new.mp4'));
      expect(api.getPlaybackUrl).toHaveBeenCalledTimes(2);
      expect(play).not.toHaveBeenCalled();

      // The new file loads: it picks up at the same spot and plays
      state.currentTime = 0;
      fireEvent.loadedMetadata(video);
      expect(state.currentTime).toBe(40);
      expect(play).toHaveBeenCalled();
    });

    it('gets a fresh URL when the video fails to load', async () => {
      api.getPlaybackUrl
        .mockResolvedValueOnce({
          url: 'https://video.test/old.mp4',
          expiresAt: inAnHour(),
          durationSeconds: 120,
        })
        .mockResolvedValueOnce({
          url: 'https://video.test/new.mp4',
          expiresAt: inAnHour(),
          durationSeconds: 120,
        });
      const { video } = await setup();

      fireEvent.error(video);

      await waitFor(() => expect(video).toHaveAttribute('src', 'https://video.test/new.mp4'));
    });
  });
});
