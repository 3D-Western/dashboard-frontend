import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAPI } from '@/api/client/training';
import { createAttempt, createVideoBlock, createVideoStep } from '@test/utils/trainingFactories';
import type { Attempt } from '@/types/training';
import { TrainingReview } from './TrainingReview';

vi.mock('@/api/client/training', () => ({
  trainingAPI: {
    getReviewAttempt: vi.fn(),
    getReviewPlaybackUrl: vi.fn(),
    // Everything below must never be called in review mode
    getAttempt: vi.fn(),
    getPlaybackUrl: vi.fn(),
    sendHeartbeat: vi.fn(),
    answerCheckpoint: vi.fn(),
    completeReading: vi.fn(),
    acceptAttestation: vi.fn(),
    openQuiz: vi.fn(),
    saveQuizAnswers: vi.fn(),
    submitQuiz: vi.fn(),
    acceptPledge: vi.fn(),
    abandonAttempt: vi.fn(),
  },
}));

const api = trainingAPI as unknown as Record<string, Mock>;

const reviewable = (overrides: Partial<Attempt> = {}): Attempt =>
  createAttempt({
    attemptId: 42,
    status: 'FAILED',
    scorePercent: 60,
    reviewSteps: [{ position: 2, stepId: 8, title: 'Safety reading' }],
    steps: [
      createVideoStep({
        stepId: 7,
        status: 'COMPLETED',
        video: createVideoBlock({ checkpoints: [] }),
      }),
      {
        stepId: 8,
        position: 2,
        type: 'READING',
        title: 'Safety reading',
        status: 'COMPLETED',
        addonScope: false,
        reading: {
          bodyMarkdown: 'Wear **eye protection** at all times.',
          dwellSeconds: 0,
          gateQuestion: null,
        },
      },
      {
        stepId: 9,
        position: 3,
        type: 'ATTESTATION',
        title: 'Confirmation',
        status: 'COMPLETED',
        addonScope: false,
        attestation: { text: 'I will follow the rules of the space.' },
      },
    ],
    ...overrides,
  });

/** The video element (the section is also labelled by its heading, so the label alone is not unique). */
const findVideo = () =>
  waitFor(() => {
    const video = document.querySelector('video');
    if (!video) throw new Error('no video yet');
    return video as HTMLVideoElement;
  });

beforeEach(() => {
  vi.clearAllMocks();
  api.getReviewAttempt.mockResolvedValue(reviewable());
  api.getReviewPlaybackUrl.mockResolvedValue({
    url: 'https://video.test/review.mp4',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    durationSeconds: 120,
  });
});

describe('TrainingReview (review mode of the player)', () => {
  it('says nothing is recorded and offers a way back to the results', async () => {
    render(<TrainingReview attemptId={42} />);

    const banner = (await screen.findAllByRole('status'))[0];
    expect(within(banner).getByText(/review: nothing is recorded/i)).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: /back to my results/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/dashboard/training/attempt/42'));
  });

  it('opens on the first section to revisit and marks it', async () => {
    render(<TrainingReview attemptId={42} />);

    expect(await screen.findByRole('heading', { name: 'Safety reading' })).toBeInTheDocument();
    expect(screen.getByText(/wear/i)).toBeInTheDocument();
    const nav = screen.getByRole('list', { name: /sections/i });
    const revisit = within(nav).getByRole('button', { name: /safety reading/i });
    expect(within(revisit).getByText('Revisit')).toBeInTheDocument();
    expect(revisit).toHaveAttribute('aria-current', 'step');
    // The other sections are not marked
    expect(within(nav).getAllByText('Revisit')).toHaveLength(1);
  });

  it('opens on the section a result link asked for', async () => {
    render(<TrainingReview attemptId={42} initialStepId={9} />);

    expect(await screen.findByRole('heading', { name: 'Confirmation' })).toBeInTheDocument();
    expect(screen.getByText('I will follow the rules of the space.')).toBeInTheDocument();
  });

  it('lets the student move between the video, the reading and the attestation text', async () => {
    render(<TrainingReview attemptId={42} />);
    await screen.findByRole('heading', { name: 'Safety reading' });

    await userEvent.click(screen.getByRole('button', { name: 'Confirmation' }));
    expect(screen.getByText('I will follow the rules of the space.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Welcome video' }));
    expect(await findVideo()).toHaveAttribute('src', 'https://video.test/review.mp4');
    expect(api.getReviewPlaybackUrl).toHaveBeenCalledWith(42, 7);
    // The video comes from the review endpoint only, never the live one
    expect(api.getPlaybackUrl).not.toHaveBeenCalled();
  });

  it('shows no quiz, no questions and no buttons that record anything', async () => {
    render(<TrainingReview attemptId={42} />);
    await screen.findByRole('heading', { name: 'Safety reading' });

    expect(
      screen.queryByRole('button', {
        name: /continue|confirm and|check my|submit|cancel this attempt|i've read/i,
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByText(/pledge/i)).not.toBeInTheDocument();
  });

  it('sends nothing while a video plays, and never asks for the live attempt', async () => {
    render(<TrainingReview attemptId={42} initialStepId={7} />);
    const video = await findVideo();

    video.dispatchEvent(new Event('play'));
    video.dispatchEvent(new Event('pause'));
    // Seeking is free in review
    await waitFor(() =>
      expect(screen.getByRole('slider', { name: /video position/i })).not.toBeDisabled(),
    );

    expect(api.sendHeartbeat).not.toHaveBeenCalled();
    expect(api.getAttempt).not.toHaveBeenCalled();
    expect(screen.queryByRole('progressbar', { name: /video watched/i })).not.toBeInTheDocument();
  });

  it('explains a refusal in plain words and offers a way back', async () => {
    api.getReviewAttempt.mockRejectedValue(new ApiError('REVIEW_NOT_AVAILABLE'));

    render(<TrainingReview attemptId={42} />);

    expect(
      await screen.findByText(/review the material after an attempt that was not passed/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to my training/i })).toBeInTheDocument();
  });

  it('can try again after a load failure', async () => {
    api.getReviewAttempt.mockRejectedValueOnce(new ApiError('REQUEST_FAILED'));

    render(<TrainingReview attemptId={42} />);
    await userEvent.click(await screen.findByRole('button', { name: /try again/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Safety reading' })).toBeInTheDocument(),
    );
  });
});
