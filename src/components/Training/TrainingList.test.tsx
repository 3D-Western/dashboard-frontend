import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAPI } from '@/api/client/training';
import { TrainingsProvider } from '@/providers/trainings-provider';
import { createAttempt, createTrainingSummary } from '@test/utils/trainingFactories';
import type { Certification, TrainingSummary } from '@/types/training';
import { TrainingCard } from './TrainingCard';
import { TrainingList } from './TrainingList';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/api/client/training', () => ({
  trainingAPI: { getMyTrainings: vi.fn(), startAttempt: vi.fn() },
}));

const api = trainingAPI as unknown as { getMyTrainings: Mock; startAttempt: Mock };

const NOW = new Date('2026-10-20T12:00:00Z');
const cert = (overrides: Partial<Certification> = {}): Certification => ({
  status: 'ACTIVE',
  activeSince: '2026-09-01T00:00:00Z',
  expiresAt: null,
  addonRequired: false,
  addonDueAt: null,
  ...overrides,
});

function renderCard(training: TrainingSummary, props: { starting?: boolean; onStart?: Mock } = {}) {
  const onStart = props.onStart ?? vi.fn();
  render(
    <TrainingCard
      training={training}
      starting={props.starting ?? false}
      onStart={onStart}
      now={NOW}
    />,
  );
  return { onStart };
}

beforeEach(() => {
  push.mockClear();
});

describe('TrainingCard', () => {
  it('tells a student who is still waiting why the last in-person check did not pass', () => {
    renderCard(
      createTrainingSummary({
        kind: 'EQUIPMENT',
        requiresSignoff: true,
        certification: cert({ status: 'AWAITING_SIGNOFF', activeSince: null }),
        nextAction: 'AWAITING_SIGNOFF',
        signoffFeedback: {
          reason: 'Could not find the emergency stop',
          decidedAt: '2026-10-20T11:00:00Z',
          mustRedoOnline: false,
        },
      }),
    );

    expect(screen.getByText(/not ready to sign you off yet/i)).toBeInTheDocument();
    expect(screen.getByText('Could not find the emergency stop')).toBeInTheDocument();
    expect(screen.getByText(/do not need to retake the online part/i)).toBeInTheDocument();
  });

  it('tells a student who must redo the online part, with the reason', () => {
    renderCard(
      createTrainingSummary({
        kind: 'EQUIPMENT',
        certification: cert({ status: 'LAPSED', activeSince: null }),
        signoffFeedback: {
          reason: 'Start from the beginning',
          decidedAt: '2026-10-20T11:00:00Z',
          mustRedoOnline: true,
        },
      }),
    );

    expect(screen.getByText(/asked you to redo the online training/i)).toBeInTheDocument();
    expect(screen.getByText('Start from the beginning')).toBeInTheDocument();
  });

  it('shows no note when there is no feedback', () => {
    renderCard(createTrainingSummary());
    expect(screen.queryByText(/supervisor/i)).not.toBeInTheDocument();
  });

  it('offers to start a training not started yet', async () => {
    const { onStart } = renderCard(createTrainingSummary());

    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getByText(/orientation · 3 steps/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /start training/i }));
    expect(onStart).toHaveBeenCalledWith('maker-orientation');
  });

  it('continues an attempt that is in progress', () => {
    renderCard(
      createTrainingSummary({
        certification: cert({ status: 'IN_PROGRESS', activeSince: null }),
        nextAction: 'RESUME',
        inProgressAttemptId: 42,
      }),
    );

    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continue where you left off/i })).toHaveAttribute(
      'href',
      '/dashboard/training/attempt/42',
    );
  });

  it('shows when a certification expires, and warns when it is close', () => {
    renderCard(
      createTrainingSummary({
        nextAction: 'NONE',
        certification: cert({ expiresAt: '2026-11-01T12:00:00Z' }),
      }),
    );

    expect(screen.getByText('Certified')).toBeInTheDocument();
    expect(screen.getByText(/certified since/i)).toBeInTheDocument();
    expect(screen.getByText(/expires in 12 days/i)).toBeInTheDocument();
    expect(screen.getByText(/you're all set/i)).toBeInTheDocument();
  });

  it('shows the add-on deadline and the button for the new material', async () => {
    const { onStart } = renderCard(
      createTrainingSummary({
        kind: 'EQUIPMENT',
        title: 'Laser Cutter',
        slug: 'laser',
        nextAction: 'START_ADDON',
        certification: cert({ addonRequired: true, addonDueAt: '2026-11-15T00:00:00Z' }),
      }),
    );

    expect(screen.getByText(/new material to complete by/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /complete the new material/i }));
    expect(onStart).toHaveBeenCalledWith('laser');
  });

  it('offers a refresher when one is due', () => {
    renderCard(
      createTrainingSummary({
        nextAction: 'START_REFRESHER',
        certification: cert({ status: 'REFRESHER_DUE' }),
      }),
    );

    expect(screen.getByText('Refresher due')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start refresher/i })).toBeInTheDocument();
  });

  it('tells a learner awaiting sign-off what happens next, with no start button', () => {
    renderCard(
      createTrainingSummary({
        kind: 'EQUIPMENT',
        nextAction: 'AWAITING_SIGNOFF',
        certification: cert({ status: 'AWAITING_SIGNOFF', activeSince: null }),
      }),
    );

    expect(screen.getByText('Awaiting sign-off')).toBeInTheDocument();
    expect(screen.getByText(/sign you off in person/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the cooldown with the time left when blocked', () => {
    renderCard(
      createTrainingSummary({
        nextAction: 'BLOCKED',
        blockedReason: 'RETRY_COOLDOWN',
        retryAt: '2026-10-20T12:25:00Z',
        certification: cert({ status: 'IN_PROGRESS', activeSince: null }),
      }),
    );

    expect(screen.getByText(/try this training again in 25 minutes/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers a retry once the cooldown has passed', async () => {
    const { onStart } = renderCard(
      createTrainingSummary({
        nextAction: 'BLOCKED',
        blockedReason: 'RETRY_COOLDOWN',
        retryAt: '2026-10-20T11:00:00Z',
      }),
    );

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onStart).toHaveBeenCalled();
  });

  it.each([
    ['ATTEMPT_LIMIT_REACHED', /used all your attempts/i],
    ['CERTIFICATION_REVOKED', /certification was revoked/i],
  ])('explains a block for %s', (blockedReason, pattern) => {
    renderCard(createTrainingSummary({ nextAction: 'BLOCKED', blockedReason }));

    expect(screen.getByText(pattern)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  describe('after a failed attempt (backend leaves the certification at IN_PROGRESS)', () => {
    const started = cert({ status: 'IN_PROGRESS', activeSince: null });

    it('says "Not passed yet" instead of "In progress" and offers Try again', async () => {
      const { onStart } = renderCard(
        createTrainingSummary({ certification: started, nextAction: 'START' }),
      );

      expect(screen.getByText('Not passed yet')).toBeInTheDocument();
      expect(screen.queryByText('In progress')).not.toBeInTheDocument();
      expect(screen.getByText(/haven't passed this training yet/i)).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(onStart).toHaveBeenCalledWith('maker-orientation');
      expect(screen.queryByRole('button', { name: /start training/i })).not.toBeInTheDocument();
    });

    it('shows the retry time during the cooldown', () => {
      renderCard(
        createTrainingSummary({
          certification: started,
          nextAction: 'BLOCKED',
          blockedReason: 'RETRY_COOLDOWN',
          retryAt: '2026-10-20T12:40:00Z',
        }),
      );

      expect(screen.getByText('Not passed yet')).toBeInTheDocument();
      expect(screen.getByText(/try this training again in 40 minutes/i)).toBeInTheDocument();
    });

    it('still says "In progress" while an attempt is actually open', () => {
      renderCard(
        createTrainingSummary({
          certification: started,
          nextAction: 'RESUME',
          inProgressAttemptId: 4,
        }),
      );

      expect(screen.getByText('In progress')).toBeInTheDocument();
      expect(screen.queryByText('Not passed yet')).not.toBeInTheDocument();
    });

    it('a training never started still says "Start training"', () => {
      renderCard(createTrainingSummary());

      expect(screen.getByText('Not started')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start training/i })).toBeInTheDocument();
    });
  });

  it('disables the button while starting', () => {
    renderCard(createTrainingSummary(), { starting: true });

    expect(screen.getByRole('button', { name: /starting/i })).toBeDisabled();
  });
});

describe('TrainingList', () => {
  const renderList = () =>
    render(
      <TrainingsProvider>
        <TrainingList />
      </TrainingsProvider>,
    );

  it('lists orientation first, then equipment trainings by name', async () => {
    api.getMyTrainings.mockResolvedValue({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [
        createTrainingSummary({ slug: 'laser', title: 'Laser Cutter', kind: 'EQUIPMENT' }),
        createTrainingSummary({ slug: 'cnc', title: 'CNC Router', kind: 'EQUIPMENT' }),
        createTrainingSummary({ slug: 'orientation', title: 'Maker Orientation' }),
      ],
    });
    renderList();

    const headings = await screen.findAllByRole('heading', { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual([
      'Maker Orientation',
      'CNC Router',
      'Laser Cutter',
    ]);
  });

  it('starts a training and opens the player', async () => {
    api.getMyTrainings.mockResolvedValue({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [createTrainingSummary()],
    });
    api.startAttempt.mockResolvedValue(createAttempt({ attemptId: 88 }));
    renderList();

    await userEvent.click(await screen.findByRole('button', { name: /start training/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/training/attempt/88'));
    expect(api.startAttempt).toHaveBeenCalledWith('maker-orientation');
  });

  it('resumes the attempt the server says is already in progress', async () => {
    api.getMyTrainings.mockResolvedValue({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [createTrainingSummary()],
    });
    api.startAttempt.mockRejectedValue(
      new ApiError('ATTEMPT_ALREADY_IN_PROGRESS', 'x', { attemptId: 31 }),
    );
    renderList();

    await userEvent.click(await screen.findByRole('button', { name: /start training/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/training/attempt/31'));
  });

  it('shows the reason on the card and reloads the list when starting is refused', async () => {
    api.getMyTrainings.mockResolvedValue({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [createTrainingSummary()],
    });
    api.startAttempt.mockRejectedValue(new ApiError('ATTEMPT_LIMIT_REACHED'));
    renderList();

    await userEvent.click(await screen.findByRole('button', { name: /start training/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/used all your attempts/i);
    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(api.getMyTrainings).toHaveBeenCalledTimes(2));
  });

  it('has an empty state', async () => {
    api.getMyTrainings.mockResolvedValue({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [],
    });
    renderList();

    expect(await screen.findByText(/no trainings to take yet/i)).toBeInTheDocument();
  });

  it('shows an error with a retry', async () => {
    api.getMyTrainings.mockRejectedValueOnce(new Error('down'));
    renderList();

    expect(await screen.findByText(/couldn't load your training/i)).toBeInTheDocument();
    api.getMyTrainings.mockResolvedValue({
      orientationComplete: false,
      orientationRequired: true,
      trainings: [createTrainingSummary()],
    });
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    const card = await screen.findByRole('article');
    expect(within(card).getByText('Maker Orientation')).toBeInTheDocument();
  });
});
