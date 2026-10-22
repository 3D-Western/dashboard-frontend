import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { trainingAPI } from '@/api/client/training';
import { TrainingsProvider } from '@/providers/trainings-provider';
import { createAttempt, createTrainingSummary } from '@test/utils/trainingFactories';
import type { MyTrainings } from '@/types/training';
import { OrientationPrompt } from './OrientationPrompt';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/api/client/training', () => ({
  trainingAPI: { getMyTrainings: vi.fn(), startAttempt: vi.fn() },
}));

const api = trainingAPI as unknown as { getMyTrainings: Mock; startAttempt: Mock };

const renderPrompt = (data: MyTrainings) => {
  api.getMyTrainings.mockResolvedValue(data);
  return render(
    <TrainingsProvider>
      <OrientationPrompt />
    </TrainingsProvider>,
  );
};

beforeEach(() => push.mockClear());

describe('OrientationPrompt', () => {
  it('leads a new member to Maker Orientation, and starts it in one tap', async () => {
    api.startAttempt.mockResolvedValue(createAttempt({ attemptId: 5 }));
    renderPrompt({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [createTrainingSummary()],
    });

    expect(
      await screen.findByRole('heading', { name: /start with maker orientation/i }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /start orientation/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/training/attempt/5'));
    expect(api.startAttempt).toHaveBeenCalledWith('maker-orientation');
  });

  it('continues an orientation that is already under way', async () => {
    renderPrompt({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [createTrainingSummary({ nextAction: 'RESUME', inProgressAttemptId: 9 })],
    });

    expect(
      await screen.findByRole('heading', { name: /finish maker orientation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continue orientation/i })).toHaveAttribute(
      'href',
      '/dashboard/training/attempt/9',
    );
  });

  it('links to the training page when orientation cannot be started right now', async () => {
    renderPrompt({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [
        createTrainingSummary({ nextAction: 'BLOCKED', blockedReason: 'RETRY_COOLDOWN' }),
      ],
    });

    expect(await screen.findByRole('link', { name: /see your training/i })).toHaveAttribute(
      'href',
      '/dashboard/training',
    );
  });

  describe('after a failed orientation quiz', () => {
    const started = {
      status: 'IN_PROGRESS' as const,
      activeSince: null,
      expiresAt: null,
      addonRequired: false,
      addonDueAt: null,
    };

    it('no longer says "Start with Maker Orientation": it says not passed yet, and offers Try again', async () => {
      api.startAttempt.mockResolvedValue(createAttempt({ attemptId: 8 }));
      renderPrompt({
        orientationComplete: false,
        orientationRequired: true,
        trainings: [createTrainingSummary({ certification: started, nextAction: 'START' })],
      });

      expect(
        await screen.findByRole('heading', { name: /haven't passed maker orientation yet/i }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/start with maker orientation/i)).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
      await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/training/attempt/8'));
    });

    it('shows the retry time during the cooldown, with a link instead of a start button', async () => {
      renderPrompt({
        orientationComplete: false,
        orientationRequired: true,
        trainings: [
          createTrainingSummary({
            certification: started,
            nextAction: 'BLOCKED',
            blockedReason: 'RETRY_COOLDOWN',
            retryAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          }),
        ],
      });

      expect(
        await screen.findByText(/try this training again in \d+ minutes/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /try again|start orientation/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /see your training/i })).toBeInTheDocument();
    });

    it('offers Try again once the cooldown has run out', async () => {
      renderPrompt({
        orientationComplete: false,
        orientationRequired: true,
        trainings: [
          createTrainingSummary({
            certification: started,
            nextAction: 'BLOCKED',
            blockedReason: 'RETRY_COOLDOWN',
            retryAt: new Date(Date.now() - 60_000).toISOString(),
          }),
        ],
      });

      expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });
  });

  it('shows nothing once orientation is complete', async () => {
    const { container } = renderPrompt({
      orientationComplete: true,
      orientationRequired: true,
      trainings: [createTrainingSummary({ nextAction: 'NONE' })],
    });

    await waitFor(() => expect(api.getMyTrainings).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing when there is no orientation to lead to', async () => {
    const { container } = renderPrompt({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [createTrainingSummary({ kind: 'EQUIPMENT', slug: 'laser' })],
    });

    await waitFor(() => expect(api.getMyTrainings).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('does not lock anything: it only offers a way in', async () => {
    renderPrompt({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [createTrainingSummary()],
    });
    await screen.findByRole('heading', { name: /maker orientation/i });

    expect(screen.queryByText(/locked|blocked|unavailable|cannot use/i)).not.toBeInTheDocument();
  });

  it('shows why starting failed', async () => {
    const { ApiError } = await import('@/api/client/errors');
    api.startAttempt.mockRejectedValue(new ApiError('TRAINING_NOT_AVAILABLE'));
    renderPrompt({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [createTrainingSummary()],
    });

    await userEvent.click(await screen.findByRole('button', { name: /start orientation/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/isn't available right now/i);
  });
});
