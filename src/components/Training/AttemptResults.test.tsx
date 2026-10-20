import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { trainingAPI } from '@/api/client/training';
import { createAttempt, createTrainingSummary } from '@test/utils/trainingFactories';
import type { QuizResult } from '@/types/training';
import { AttemptResults } from './AttemptResults';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/api/client/training', () => ({
  trainingAPI: {
    getMyTrainings: vi.fn(),
    startAttempt: vi.fn(),
  },
}));

const api = trainingAPI as unknown as { getMyTrainings: Mock; startAttempt: Mock };

const failed: QuizResult = {
  passed: false,
  scorePercent: 70,
  criticalAllCorrect: false,
  passMarkPercent: 90,
  attemptStatus: 'FAILED',
  reviewSteps: [
    { position: 1, stepId: 11, title: 'Safety video' },
    { position: 2, stepId: 12, title: 'Emergency procedures' },
  ],
  certificationStatus: null,
  retryAt: null,
};

beforeEach(() => {
  push.mockClear();
  api.getMyTrainings.mockResolvedValue({
    orientationComplete: false,
    trainings: [createTrainingSummary({ nextAction: 'START' })],
  });
});

describe('AttemptResults: fail', () => {
  const failedAttempt = () =>
    createAttempt({ status: 'FAILED', scorePercent: 70, criticalAllCorrect: false });

  it('shows the score, the pass mark and which sections to go back to', async () => {
    render(<AttemptResults attempt={failedAttempt()} quizResult={failed} />);

    expect(screen.getByRole('heading', { name: /not passed this time/i })).toBeInTheDocument();
    expect(screen.getByText(/your score: 70%/i)).toBeInTheDocument();
    expect(screen.getByText(/you need 90% to pass/i)).toBeInTheDocument();
    expect(screen.getByText(/safety-critical question was missed/i)).toBeInTheDocument();
    expect(screen.getByText('Safety video')).toBeInTheDocument();
    expect(screen.getByText('Emergency procedures')).toBeInTheDocument();
  });

  it('never renders answer correctness, even if the payload had it', () => {
    // The API does not send these. If it ever did, the screen must still not show them.
    const leaky = {
      ...failed,
      questions: [
        { questionVersionId: 1, correct: true, correctOptionIds: [2], explanation: 'Because.' },
      ],
      correctOptionIds: [2],
      explanation: 'Because.',
    } as unknown as QuizResult;
    const attempt = {
      ...failedAttempt(),
      answers: [{ questionVersionId: 1, correct: false }],
    } as unknown as ReturnType<typeof failedAttempt>;

    const { container } = render(<AttemptResults attempt={attempt} quizResult={leaky} />);

    expect(container.textContent).not.toMatch(
      /\bcorrect\b|incorrect|right answer|wrong answer|because\./i,
    );
    expect(screen.queryByRole('img', { name: /correct/i })).not.toBeInTheDocument();
  });

  it('points at the material, not at questions', () => {
    render(<AttemptResults attempt={failedAttempt()} quizResult={failed} />);

    expect(
      screen.getByRole('heading', { name: /go back over these sections/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/question \d/i)).not.toBeInTheDocument();
  });

  it('works when reopening a finished attempt (no quiz result in hand)', () => {
    const attempt = createAttempt({
      status: 'FAILED',
      scorePercent: 60,
      criticalAllCorrect: true,
      reviewSteps: [{ position: 3, stepId: 13, title: 'Machine basics' }],
    });
    render(<AttemptResults attempt={attempt} quizResult={null} />);

    expect(screen.getByText(/your score: 60%/i)).toBeInTheDocument();
    expect(screen.queryByText(/you need/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/safety-critical/i)).not.toBeInTheDocument();
    expect(screen.getByText('Machine basics')).toBeInTheDocument();
  });

  it('offers to try again when a new attempt can start, and opens it', async () => {
    api.startAttempt.mockResolvedValue(createAttempt({ attemptId: 77 }));
    render(<AttemptResults attempt={failedAttempt()} quizResult={failed} />);

    await userEvent.click(await screen.findByRole('button', { name: /try again/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/training/attempt/77'));
    expect(api.startAttempt).toHaveBeenCalledWith('maker-orientation');
  });

  it('shows the cooldown with time left instead of a try again button', async () => {
    const retryAt = new Date(Date.now() + 30 * 60_000).toISOString();
    api.getMyTrainings.mockResolvedValue({
      orientationComplete: false,
      trainings: [
        createTrainingSummary({ nextAction: 'BLOCKED', blockedReason: 'RETRY_COOLDOWN', retryAt }),
      ],
    });
    render(<AttemptResults attempt={failedAttempt()} quizResult={{ ...failed, retryAt }} />);

    expect(
      await screen.findByText(/you can try this training again in \d+ minutes/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('explains the attempt limit', async () => {
    api.getMyTrainings.mockResolvedValue({
      orientationComplete: false,
      trainings: [
        createTrainingSummary({ nextAction: 'BLOCKED', blockedReason: 'ATTEMPT_LIMIT_REACHED' }),
      ],
    });
    render(<AttemptResults attempt={failedAttempt()} quizResult={failed} />);

    expect(await screen.findByText(/used all your attempts/i)).toBeInTheDocument();
  });
});

describe('AttemptResults: pass', () => {
  it('tells an orientation graduate they are certified', async () => {
    api.getMyTrainings.mockResolvedValue({
      orientationComplete: true,
      trainings: [
        createTrainingSummary({
          nextAction: 'NONE',
          certification: {
            status: 'ACTIVE',
            activeSince: '2026-10-20T00:00:00Z',
            expiresAt: null,
            addonRequired: false,
            addonDueAt: null,
          },
        }),
      ],
    });
    const result: QuizResult = {
      ...failed,
      passed: true,
      scorePercent: 95,
      criticalAllCorrect: true,
      attemptStatus: 'PASSED',
      reviewSteps: [],
      certificationStatus: 'ACTIVE',
    };
    render(
      <AttemptResults
        attempt={createAttempt({ status: 'PASSED', scorePercent: 95 })}
        quizResult={result}
      />,
    );

    expect(screen.getByRole('heading', { name: /you passed/i })).toBeInTheDocument();
    expect(screen.getByText(/your score: 95%/i)).toBeInTheDocument();
    expect(screen.getByText(/you're certified/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to my training/i })).toBeInTheDocument();
  });

  it('points to the in-person sign-off for equipment training', () => {
    const result: QuizResult = {
      ...failed,
      passed: true,
      attemptStatus: 'PASSED',
      reviewSteps: [],
      certificationStatus: 'AWAITING_SIGNOFF',
    };
    render(<AttemptResults attempt={createAttempt({ status: 'PASSED' })} quizResult={result} />);

    expect(screen.getByText(/in-person sign-off/i)).toBeInTheDocument();
  });
});

describe('AttemptResults: cancelled', () => {
  it('says it does not count against the attempts', () => {
    render(<AttemptResults attempt={createAttempt({ status: 'ABANDONED' })} quizResult={null} />);

    expect(
      screen.getByRole('heading', { name: /this attempt was cancelled/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/doesn't count against your attempts/i)).toBeInTheDocument();
  });
});
