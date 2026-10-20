import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAPI } from '@/api/client/training';
import {
  createAttempt,
  createQuestion,
  createTrainingSummary,
  createVideoBlock,
} from '@test/utils/trainingFactories';
import type { Attempt, AttemptStep, StepStatus } from '@/types/training';
import { TrainingPlayer } from './TrainingPlayer';

vi.mock('@/api/client/training', () => ({
  trainingAPI: {
    getAttempt: vi.fn(),
    acceptPledge: vi.fn(),
    abandonAttempt: vi.fn(),
    completeReading: vi.fn(),
    acceptAttestation: vi.fn(),
    openQuiz: vi.fn(),
    saveQuizAnswers: vi.fn(),
    submitQuiz: vi.fn(),
    getMyTrainings: vi.fn(),
    startAttempt: vi.fn(),
  },
}));

// The video player has its own tests; here it is a button that finishes the step.
vi.mock('./VideoStep', () => ({
  VideoStep: ({ onStepCompleted }: { onStepCompleted: () => void }) => (
    <button type="button" onClick={onStepCompleted}>
      Finish the video
    </button>
  ),
}));

const api = trainingAPI as unknown as Record<string, Mock>;

/** A four-step training with the given statuses: video, reading, attestation, quiz. */
function steps(statuses: [StepStatus, StepStatus, StepStatus, StepStatus]): AttemptStep[] {
  const [video, reading, attestation, quiz] = statuses;
  const visible = (status: StepStatus) => status !== 'LOCKED';
  return [
    {
      stepId: 1,
      position: 1,
      type: 'VIDEO',
      title: 'Welcome video',
      status: video,
      addonScope: false,
      video: visible(video) ? createVideoBlock() : null,
    },
    {
      stepId: 2,
      position: 2,
      type: 'READING',
      title: 'Safety reading',
      status: reading,
      addonScope: false,
      reading: visible(reading)
        ? { bodyMarkdown: '## Wear your glasses\n\nAlways.', dwellSeconds: 0, gateQuestion: null }
        : null,
    },
    {
      stepId: 3,
      position: 3,
      type: 'ATTESTATION',
      title: 'Confirm',
      status: attestation,
      addonScope: false,
      attestation: visible(attestation) ? { text: 'I will follow the rules.' } : null,
    },
    {
      stepId: 4,
      position: 4,
      type: 'QUIZ',
      title: 'Final quiz',
      status: quiz,
      addonScope: false,
      quiz: visible(quiz) ? { opened: false, questionCount: 1, answeredCount: 0 } : null,
    },
  ];
}

const attemptAt = (statuses: Parameters<typeof steps>[0], overrides: Partial<Attempt> = {}) =>
  createAttempt({ steps: steps(statuses), ...overrides });

beforeEach(() => {
  api.getMyTrainings.mockResolvedValue({
    orientationComplete: false,
    trainings: [createTrainingSummary({ nextAction: 'NONE' })],
  });
});

describe('TrainingPlayer', () => {
  it('shows the honour pledge first, and nothing else until it is accepted', async () => {
    api.getAttempt.mockResolvedValue(
      attemptAt(['LOCKED', 'LOCKED', 'LOCKED', 'LOCKED'], {
        pledgeRequired: true,
        pledgeText: 'I will do my own work. My engagement is recorded.',
      }),
    );
    render(<TrainingPlayer attemptId={42} />);

    expect(await screen.findByText(/I will do my own work/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /finish the video/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('moves from the pledge to step 1 once it is accepted', async () => {
    api.getAttempt.mockResolvedValue(
      attemptAt(['LOCKED', 'LOCKED', 'LOCKED', 'LOCKED'], { pledgeRequired: true }),
    );
    api.acceptPledge.mockResolvedValue(attemptAt(['AVAILABLE', 'LOCKED', 'LOCKED', 'LOCKED']));
    render(<TrainingPlayer attemptId={42} />);

    await userEvent.click(await screen.findByRole('button', { name: /i agree/i }));

    expect(api.acceptPledge).toHaveBeenCalledWith(42);
    expect(await screen.findByRole('button', { name: /finish the video/i })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('takes the steps in order with visible progress, through to a pass', async () => {
    api.getAttempt
      .mockResolvedValueOnce(attemptAt(['AVAILABLE', 'LOCKED', 'LOCKED', 'LOCKED']))
      .mockResolvedValueOnce(attemptAt(['COMPLETED', 'AVAILABLE', 'LOCKED', 'LOCKED']))
      .mockResolvedValueOnce(attemptAt(['COMPLETED', 'COMPLETED', 'AVAILABLE', 'LOCKED']))
      .mockResolvedValueOnce(attemptAt(['COMPLETED', 'COMPLETED', 'COMPLETED', 'AVAILABLE']))
      .mockResolvedValue(
        attemptAt(['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED'], {
          status: 'PASSED',
          scorePercent: 100,
        }),
      );
    api.completeReading.mockResolvedValue({ stepCompleted: true, gateCorrect: null });
    api.acceptAttestation.mockResolvedValue({ stepCompleted: true, attemptStatus: 'IN_PROGRESS' });
    api.openQuiz.mockResolvedValue({ stepId: 4, questions: [createQuestion()] });
    api.saveQuizAnswers.mockResolvedValue({ stepId: 4, questions: [createQuestion()] });
    api.submitQuiz.mockResolvedValue({
      passed: true,
      scorePercent: 100,
      criticalAllCorrect: true,
      passMarkPercent: 90,
      attemptStatus: 'PASSED',
      reviewSteps: [],
      certificationStatus: 'ACTIVE',
      retryAt: null,
    });
    render(<TrainingPlayer attemptId={42} />);

    // 1. video
    expect(await screen.findByRole('heading', { name: 'Welcome video' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /training progress/i })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    await userEvent.click(screen.getByRole('button', { name: /finish the video/i }));

    // 2. reading
    expect(await screen.findByRole('heading', { name: 'Safety reading' })).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Wear your glasses' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /training progress/i })).toHaveAttribute(
      'aria-valuenow',
      '1',
    );
    await userEvent.click(screen.getByRole('button', { name: /i've read this/i }));
    expect(api.completeReading).toHaveBeenCalledWith(
      42,
      2,
      expect.objectContaining({ dwellSeconds: expect.any(Number) }),
    );

    // 3. attestation (the button stays off until the box is ticked)
    expect(await screen.findByRole('heading', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByText('I will follow the rules.')).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: /confirm and continue/i });
    expect(confirm).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(confirm);
    expect(api.acceptAttestation).toHaveBeenCalledWith(42, 3);

    // 4. quiz
    expect(await screen.findByRole('heading', { name: 'Final quiz' })).toBeInTheDocument();
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
    await userEvent.click(await screen.findByLabelText('On the front panel'));
    await userEvent.click(screen.getByRole('button', { name: /submit quiz/i }));

    // results
    expect(await screen.findByRole('heading', { name: /you passed/i })).toBeInTheDocument();
    expect(screen.getByText(/your score: 100%/i)).toBeInTheDocument();
  });

  it('moves focus to the new step heading when the step changes', async () => {
    api.getAttempt
      .mockResolvedValueOnce(attemptAt(['AVAILABLE', 'LOCKED', 'LOCKED', 'LOCKED']))
      .mockResolvedValue(attemptAt(['COMPLETED', 'AVAILABLE', 'LOCKED', 'LOCKED']));
    render(<TrainingPlayer attemptId={42} />);

    const first = await screen.findByRole('heading', { name: 'Welcome video' });
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute('tabindex', '-1');

    await userEvent.click(screen.getByRole('button', { name: /finish the video/i }));

    const second = await screen.findByRole('heading', { name: 'Safety reading' });
    await waitFor(() => expect(second).toHaveFocus());
  });

  it('offers a retry when reloading after a finished step fails', async () => {
    api.getAttempt
      .mockResolvedValueOnce(attemptAt(['AVAILABLE', 'LOCKED', 'LOCKED', 'LOCKED']))
      .mockRejectedValueOnce(new ApiError('REQUEST_FAILED'))
      .mockResolvedValue(attemptAt(['COMPLETED', 'AVAILABLE', 'LOCKED', 'LOCKED']));
    render(<TrainingPlayer attemptId={42} />);

    await userEvent.click(await screen.findByRole('button', { name: /finish the video/i }));

    expect(await screen.findByText(/couldn't reach the server/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: 'Safety reading' })).toBeInTheDocument();
    expect(screen.queryByText(/couldn't reach the server/i)).not.toBeInTheDocument();
  });

  it('keeps the quiz locked after submitting until the attempt has reloaded', async () => {
    api.getAttempt
      .mockResolvedValueOnce(attemptAt(['COMPLETED', 'COMPLETED', 'COMPLETED', 'AVAILABLE']))
      .mockReturnValue(new Promise(() => undefined)); // the reload is still on its way
    api.openQuiz.mockResolvedValue({ stepId: 4, questions: [createQuestion()] });
    api.saveQuizAnswers.mockResolvedValue({ stepId: 4, questions: [createQuestion()] });
    api.submitQuiz.mockResolvedValue({
      passed: true,
      scorePercent: 100,
      criticalAllCorrect: true,
      passMarkPercent: 90,
      attemptStatus: 'PASSED',
      reviewSteps: [],
      certificationStatus: 'ACTIVE',
      retryAt: null,
    });
    render(<TrainingPlayer attemptId={42} />);
    await userEvent.click(await screen.findByLabelText('On the front panel'));
    const submit = screen.getByRole('button', { name: /submit quiz/i });

    await userEvent.click(submit);
    await waitFor(() => expect(api.submitQuiz).toHaveBeenCalledTimes(1));

    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /submitting/i }));
    expect(api.submitQuiz).toHaveBeenCalledTimes(1);
  });

  it('marks finished steps in the step list', async () => {
    api.getAttempt.mockResolvedValue(attemptAt(['COMPLETED', 'AVAILABLE', 'LOCKED', 'LOCKED']));
    render(<TrainingPlayer attemptId={42} />);

    const list = await screen.findByRole('list', { name: 'Steps' });
    expect(within(list).getByText(/\(done\)/)).toBeInTheDocument();
    expect(within(list).getByText(/\(current\)/)).toBeInTheDocument();
    expect(within(list).getAllByText(/\(locked\)/)).toHaveLength(2);
  });

  it('says what a refresher or add-on attempt covers', async () => {
    api.getAttempt.mockResolvedValue(
      attemptAt(['LOCKED', 'LOCKED', 'LOCKED', 'AVAILABLE'], { kind: 'REFRESHER' }),
    );
    render(<TrainingPlayer attemptId={42} />);

    expect(await screen.findByText(/refresher: a short re-check/i)).toBeInTheDocument();
  });

  it('shows a plain message and a way back when the attempt cannot be loaded', async () => {
    api.getAttempt.mockRejectedValueOnce(new ApiError('ATTEMPT_NOT_FOUND'));
    render(<TrainingPlayer attemptId={999} />);

    expect(await screen.findByText(/couldn't find that attempt/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to my training/i })).toHaveAttribute(
      'href',
      '/dashboard/training',
    );

    api.getAttempt.mockResolvedValue(attemptAt(['AVAILABLE', 'LOCKED', 'LOCKED', 'LOCKED']));
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('button', { name: /finish the video/i })).toBeInTheDocument();
  });

  it('can cancel an attempt after confirming', async () => {
    api.getAttempt.mockResolvedValue(attemptAt(['AVAILABLE', 'LOCKED', 'LOCKED', 'LOCKED']));
    api.abandonAttempt.mockResolvedValue(
      attemptAt(['AVAILABLE', 'LOCKED', 'LOCKED', 'LOCKED'], { status: 'ABANDONED' }),
    );
    render(<TrainingPlayer attemptId={42} />);

    await userEvent.click(await screen.findByRole('button', { name: /cancel this attempt/i }));
    await userEvent.click(screen.getByRole('button', { name: /^cancel attempt$/i }));

    await waitFor(() => expect(api.abandonAttempt).toHaveBeenCalledWith(42));
    expect(await screen.findByText(/this attempt was cancelled/i)).toBeInTheDocument();
  });
});

describe('ReadingStep gate question', () => {
  const gated = () =>
    attemptAt(['COMPLETED', 'AVAILABLE', 'LOCKED', 'LOCKED']).steps.map((step) =>
      step.type === 'READING'
        ? {
            ...step,
            reading: {
              bodyMarkdown: 'Read this.',
              dwellSeconds: 0,
              gateQuestion: createQuestion({ questionVersionId: 701, promptMarkdown: 'Gate?' }),
            },
          }
        : step,
    );

  it('sends the gate answer and lets the learner try again after a wrong one', async () => {
    api.getAttempt.mockResolvedValue(createAttempt({ steps: gated() }));
    api.completeReading
      .mockResolvedValueOnce({ stepCompleted: false, gateCorrect: false })
      .mockResolvedValueOnce({ stepCompleted: true, gateCorrect: true });
    render(<TrainingPlayer attemptId={42} />);

    await userEvent.click(await screen.findByLabelText('Behind the machine'));
    await userEvent.click(screen.getByRole('button', { name: /check answer and continue/i }));

    expect(await screen.findByText(/that wasn't right/i)).toBeInTheDocument();
    expect(api.completeReading).toHaveBeenLastCalledWith(
      42,
      2,
      expect.objectContaining({ optionIds: [2] }),
    );
    expect(screen.getByLabelText('Behind the machine')).not.toBeChecked();

    await userEvent.click(screen.getByLabelText('On the front panel'));
    await userEvent.click(screen.getByRole('button', { name: /check answer and continue/i }));
    await waitFor(() => expect(api.completeReading).toHaveBeenCalledTimes(2));
  });
});
