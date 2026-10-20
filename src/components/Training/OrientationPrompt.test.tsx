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
    renderPrompt({ orientationComplete: false, trainings: [createTrainingSummary()] });

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
      trainings: [
        createTrainingSummary({ nextAction: 'BLOCKED', blockedReason: 'RETRY_COOLDOWN' }),
      ],
    });

    expect(await screen.findByRole('link', { name: /see your training/i })).toHaveAttribute(
      'href',
      '/dashboard/training',
    );
  });

  it('shows nothing once orientation is complete', async () => {
    const { container } = renderPrompt({
      orientationComplete: true,
      trainings: [createTrainingSummary({ nextAction: 'NONE' })],
    });

    await waitFor(() => expect(api.getMyTrainings).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing when there is no orientation to lead to', async () => {
    const { container } = renderPrompt({
      orientationComplete: false,
      trainings: [createTrainingSummary({ kind: 'EQUIPMENT', slug: 'laser' })],
    });

    await waitFor(() => expect(api.getMyTrainings).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('does not lock anything: it only offers a way in', async () => {
    renderPrompt({ orientationComplete: false, trainings: [createTrainingSummary()] });
    await screen.findByRole('heading', { name: /maker orientation/i });

    expect(screen.queryByText(/locked|blocked|unavailable|cannot use/i)).not.toBeInTheDocument();
  });

  it('shows why starting failed', async () => {
    const { ApiError } = await import('@/api/client/errors');
    api.startAttempt.mockRejectedValue(new ApiError('TRAINING_NOT_AVAILABLE'));
    renderPrompt({ orientationComplete: false, trainings: [createTrainingSummary()] });

    await userEvent.click(await screen.findByRole('button', { name: /start orientation/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/isn't available right now/i);
  });
});
