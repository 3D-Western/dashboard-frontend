import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { trainingAPI } from '@/api/client/training';
import { TrainingsProvider } from '@/providers/trainings-provider';
import { createTrainingSummary } from '@test/utils/trainingFactories';
import type { Certification, MyTrainings } from '@/types/training';
import { TrainingSummary } from './TrainingSummary';

vi.mock('@/api/client/training', () => ({
  trainingAPI: { getMyTrainings: vi.fn() },
}));

const getMyTrainings = trainingAPI.getMyTrainings as Mock;

const cert = (status: Certification['status'] = 'ACTIVE'): Certification => ({
  status,
  activeSince: '2026-09-01T12:00:00Z',
  expiresAt: null,
  addonRequired: false,
  addonDueAt: null,
});

const renderSummary = (data: MyTrainings) => {
  getMyTrainings.mockResolvedValue(data);
  return render(
    <TrainingsProvider>
      <TrainingSummary />
    </TrainingsProvider>,
  );
};

beforeEach(() => vi.clearAllMocks());

describe('TrainingSummary (dashboard home)', () => {
  it('shows a loading state, then real certification data', async () => {
    renderSummary({
      orientationComplete: true,
      trainings: [
        createTrainingSummary({ certification: cert(), nextAction: 'NONE' }),
        createTrainingSummary({
          slug: 'laser',
          title: 'Laser Cutter',
          kind: 'EQUIPMENT',
          certification: cert('AWAITING_SIGNOFF'),
          nextAction: 'AWAITING_SIGNOFF',
        }),
      ],
    });

    expect(screen.getByRole('status', { name: /loading training/i })).toBeInTheDocument();
    expect(await screen.findByText(/certified in 1 of 2 trainings/i)).toBeInTheDocument();
    const list = screen.getByRole('list');
    expect(within(list).getByText('Maker Orientation')).toBeInTheDocument();
    expect(within(list).getByText('Certified')).toBeInTheDocument();
    expect(within(list).getByText('Awaiting sign-off')).toBeInTheDocument();
    expect(screen.getByText(/laser cutter: find a supervisor/i)).toBeInTheDocument();
  });

  it('links to the training page', async () => {
    renderSummary({ orientationComplete: false, trainings: [createTrainingSummary()] });

    expect(await screen.findByRole('link', { name: /go to training/i })).toHaveAttribute(
      'href',
      '/dashboard/training',
    );
  });

  it('nudges to start something when nothing is certified yet', async () => {
    renderSummary({ orientationComplete: false, trainings: [createTrainingSummary()] });

    expect(await screen.findByText(/aren't certified in anything yet/i)).toBeInTheDocument();
    expect(screen.getByText(/start maker orientation/i)).toBeInTheDocument();
    expect(screen.getByText('Not started')).toBeInTheDocument();
  });

  it('nudges to carry on with a training in progress', async () => {
    renderSummary({
      orientationComplete: false,
      trainings: [
        createTrainingSummary({
          certification: cert('IN_PROGRESS'),
          nextAction: 'RESUME',
          inProgressAttemptId: 3,
        }),
      ],
    });

    expect(
      await screen.findByText(/pick up maker orientation where you left off/i),
    ).toBeInTheDocument();
  });

  it('shows "Not passed yet" (not "In progress") after a failed attempt', async () => {
    renderSummary({
      orientationComplete: false,
      trainings: [
        createTrainingSummary({ certification: cert('IN_PROGRESS'), nextAction: 'START' }),
      ],
    });

    const list = await screen.findByRole('list');
    expect(within(list).getByText('Not passed yet')).toBeInTheDocument();
    expect(within(list).queryByText('In progress')).not.toBeInTheDocument();
    expect(screen.getByText(/haven't passed maker orientation yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/start maker orientation/i)).not.toBeInTheDocument();
  });

  it('nudges about a refresher', async () => {
    renderSummary({
      orientationComplete: true,
      trainings: [
        createTrainingSummary({
          certification: cert('REFRESHER_DUE'),
          nextAction: 'START_REFRESHER',
        }),
      ],
    });

    expect(await screen.findByText(/needs a quick refresher/i)).toBeInTheDocument();
    expect(screen.getByText(/certified in 1 of 1 training\./i)).toBeInTheDocument();
  });

  it('has an empty state', async () => {
    renderSummary({ orientationComplete: false, trainings: [] });

    expect(await screen.findByText(/no trainings to take yet/i)).toBeInTheDocument();
  });

  it('shows an error with a retry', async () => {
    getMyTrainings.mockRejectedValueOnce(new Error('down'));
    render(
      <TrainingsProvider>
        <TrainingSummary />
      </TrainingsProvider>,
    );

    expect(await screen.findByText(/couldn't load your training/i)).toBeInTheDocument();
    getMyTrainings.mockResolvedValue({ orientationComplete: false, trainings: [] });
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText(/no trainings to take yet/i)).toBeInTheDocument();
  });
});
