import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { trainingAPI } from '@/api/client/training';
import { createCheckpoint, createVideoBlock, createVideoStep } from '@test/utils/trainingFactories';
import type { PreviewControls, TrainingRuntimeApi } from '@/types/training-preview';
import { TrainingRuntimeProvider } from './TrainingRuntime';
import { VideoStep } from './VideoStep';

vi.mock('@/api/client/training', () => ({
  trainingAPI: { getPlaybackUrl: vi.fn(), sendHeartbeat: vi.fn(), answerCheckpoint: vi.fn() },
}));

const controls: PreviewControls = {
  versionLabel: 'Draft version 1',
  exitHref: '/admin/training/1/draft',
  skipStep: vi.fn(),
  restart: vi.fn(),
  quizReveal: vi.fn(),
  finishQuiz: vi.fn(),
  retakeQuiz: vi.fn(),
};

const previewApi = {
  getPlaybackUrl: vi.fn().mockResolvedValue({
    url: 'https://video.test/a.mp4',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    durationSeconds: 120,
  }),
  sendHeartbeat: vi.fn().mockResolvedValue({
    watchedPercent: 0,
    creditedSeconds: 0,
    capped: false,
    stepCompleted: false,
    checkpointsRemaining: [11],
  }),
  answerCheckpoint: vi.fn(),
} as unknown as TrainingRuntimeApi;

/** happy-dom does not play media, so the element's state is driven from the test. */
function controlVideo(video: HTMLVideoElement) {
  const state = { paused: true, ended: false, seeking: false, currentTime: 0, duration: 120 };
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
  video.play = vi.fn(() => {
    state.paused = false;
    fireEvent.play(video);
    return Promise.resolve();
  });
  video.pause = vi.fn(() => {
    state.paused = true;
    fireEvent.pause(video);
  });
  return state;
}

async function setup(step = createVideoStep()) {
  render(
    <TrainingRuntimeProvider api={previewApi} preview={controls}>
      <VideoStep attemptId={0} step={step} onStepCompleted={vi.fn()} />
    </TrainingRuntimeProvider>,
  );
  const video = (await screen.findByLabelText(step.title)) as HTMLVideoElement;
  return { video, state: controlVideo(video) };
}

const watched30 = createVideoStep({
  video: createVideoBlock({ watchedRanges: [{ start: 0, end: 30 }], watchedPercent: 25 }),
});

afterEach(() => vi.clearAllMocks());

describe('VideoStep in preview mode', () => {
  it('lets staff seek anywhere, ahead of what has been watched', async () => {
    const { video, state } = await setup(watched30);

    state.currentTime = 90;
    fireEvent.seeking(video);

    expect(state.currentTime).toBe(90);
    expect(screen.queryByText(/can't skip ahead/i)).not.toBeInTheDocument();
  });

  it('lets the position slider go anywhere too', async () => {
    const { state } = await setup(watched30);

    fireEvent.change(screen.getByRole('slider', { name: /video position/i }), {
      target: { value: '100' },
    });

    expect(state.currentTime).toBe(100);
    expect(screen.queryByText(/can't skip ahead/i)).not.toBeInTheDocument();
  });

  it('still stops at a question when playback reaches it, wherever staff jumped to', async () => {
    const step = createVideoStep({
      video: createVideoBlock({ checkpoints: [createCheckpoint({ atSeconds: 20 })] }),
    });
    const { video, state } = await setup(step);

    state.currentTime = 60;
    fireEvent.seeking(video);
    state.paused = false;
    fireEvent.timeUpdate(video);

    expect(
      await screen.findByText(/quick question about what you just watched/i),
    ).toBeInTheDocument();
    expect(screen.getByText('What did the video just show?')).toBeInTheDocument();
  });

  it('asks the preview for the video and reports to it, never to the real learner API', async () => {
    const { video, state } = await setup();

    state.paused = false;
    fireEvent.play(video);
    state.currentTime = 3;
    fireEvent.timeUpdate(video);
    state.currentTime = 4;
    fireEvent.timeUpdate(video);
    state.paused = true;
    fireEvent.pause(video);

    expect(previewApi.getPlaybackUrl).toHaveBeenCalledWith(0, 7);
    expect(previewApi.sendHeartbeat).toHaveBeenCalled();
    expect(trainingAPI.getPlaybackUrl).not.toHaveBeenCalled();
    expect(trainingAPI.sendHeartbeat).not.toHaveBeenCalled();
  });
});
