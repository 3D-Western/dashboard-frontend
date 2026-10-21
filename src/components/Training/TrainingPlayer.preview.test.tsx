import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { trainingAPI } from '@/api/client/training';
import { createPreviewSession } from '@/lib/training-preview-session';
import { createPreview } from '@test/utils/trainingPreviewFactories';
import { TrainingPlayer } from './TrainingPlayer';
import { TrainingRuntimeProvider } from './TrainingRuntime';

// The real learner client must never be touched in preview mode: every method is a spy.
vi.mock('@/api/client/training', () => ({
  trainingAPI: {
    getAttempt: vi.fn(),
    acceptPledge: vi.fn(),
    abandonAttempt: vi.fn(),
    getPlaybackUrl: vi.fn(),
    sendHeartbeat: vi.fn(),
    answerCheckpoint: vi.fn(),
    completeReading: vi.fn(),
    acceptAttestation: vi.fn(),
    openQuiz: vi.fn(),
    saveQuizAnswers: vi.fn(),
    submitQuiz: vi.fn(),
    getMyTrainings: vi.fn(),
    startAttempt: vi.fn(),
  },
}));

// The video player has its own tests (VideoStep.preview.test.tsx); here it is a button that finishes the step.
vi.mock('./VideoStep', () => ({
  VideoStep: ({ onStepCompleted }: { onStepCompleted: () => void }) => (
    <button type="button" onClick={onStepCompleted}>
      Finish the video
    </button>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => vi.restoreAllMocks());

function renderPreview() {
  const session = createPreviewSession(createPreview(), {
    versionLabel: 'Draft version 2',
    exitHref: '/admin/training/1/draft',
  });
  render(
    <TrainingRuntimeProvider api={session.api} preview={session.controls}>
      <TrainingPlayer attemptId={0} />
    </TrainingRuntimeProvider>,
  );
  return session;
}

const choose = (user: ReturnType<typeof userEvent.setup>, ...labels: string[]) =>
  labels.reduce(
    (chain, label) =>
      chain.then(() =>
        user.click(
          screen.getByRole(label === 'Option 41' || label === 'Option 42' ? 'checkbox' : 'radio', {
            name: new RegExp(`^${label}`),
          }),
        ),
      ),
    Promise.resolve(),
  );

/** Starts the preview and skips to the quiz. */
async function reachTheQuiz(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /i agree, start the training/i }));
  for (let i = 0; i < 3; i++) {
    await user.click(await screen.findByRole('button', { name: /skip this step/i }));
  }
  await screen.findByText('Question 1 of 3');
}

async function answerQuiz(user: ReturnType<typeof userEvent.setup>, firstAnswer: string) {
  await choose(user, firstAnswer);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await choose(user, 'Option 41', 'Option 42');
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await choose(user, 'Option 51');
  await user.click(screen.getByRole('button', { name: /submit quiz/i }));
}

describe('TrainingPlayer in preview mode', () => {
  it('says plainly that nothing is saved, on every screen, with a way back to the editor', async () => {
    const user = userEvent.setup();
    renderPreview();

    const banner = await screen.findByRole('status');
    expect(within(banner).getByText('Preview: nothing is saved')).toBeInTheDocument();
    expect(within(banner).getByText(/draft version 2/i)).toBeInTheDocument();
    expect(within(banner).getByRole('link', { name: /back to the editor/i })).toHaveAttribute(
      'href',
      '/admin/training/1/draft',
    );

    // Still there once the pledge is accepted and a step is showing
    await user.click(screen.getByRole('button', { name: /i agree, start the training/i }));
    await screen.findByRole('heading', { name: 'Meet the machine' });
    expect(screen.getByText('Preview: nothing is saved')).toBeInTheDocument();
  });

  it('a real attempt shows no preview banner', async () => {
    const { trainingAPI: real } = await import('@/api/client/training');
    (real.getAttempt as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...createPreview().attempt,
      pledgeRequired: false,
      steps: createPreview().attempt.steps,
    });
    render(<TrainingPlayer attemptId={42} />);

    await screen.findByRole('heading', { name: 'Meet the machine' });
    expect(screen.queryByText('Preview: nothing is saved')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel this attempt/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /skip this step/i })).not.toBeInTheDocument();
  });

  it('makes no API call and no network request while someone clicks all the way through', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderPreview();

    await reachTheQuiz(user);
    await answerQuiz(user, 'Option 31');
    await user.click(await screen.findByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { name: /end of the training/i });

    expect(fetchSpy).not.toHaveBeenCalled();
    for (const call of Object.values(
      trainingAPI as unknown as Record<string, ReturnType<typeof vi.fn>>,
    )) {
      expect(call).not.toHaveBeenCalled();
    }
    expect(screen.getByText(/nothing was recorded/i)).toBeInTheDocument();
  });

  it('shows which answers were right after the quiz is submitted', async () => {
    const user = userEvent.setup();
    renderPreview();
    await reachTheQuiz(user);

    // Nothing hints at the answers while the quiz is being taken
    expect(screen.queryByText('Right answer')).not.toBeInTheDocument();

    await answerQuiz(user, 'Option 32');

    const reveal = await screen.findByTestId('quiz-reveal');
    expect(within(reveal).getByText('A student would not pass')).toBeInTheDocument();
    expect(within(reveal).getByText(/2 of 3 right/i)).toBeInTheDocument();
    // The right option of each question is marked: 31, 41 + 42, 51
    expect(within(reveal).getAllByText('Right answer')).toHaveLength(4);
    // The wrong pick is marked too, and the explanation is shown
    expect(within(reveal).getByText('Not right')).toBeInTheDocument();
    expect(within(reveal).getByText(/because of the fire risk/i)).toBeInTheDocument();
    expect(within(reveal).getByText('Safety-critical')).toBeInTheDocument();
    // A failed quiz cannot be continued from
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
  });

  it('retaking is instant and starts from a clean quiz', async () => {
    const user = userEvent.setup();
    renderPreview();
    await reachTheQuiz(user);
    await answerQuiz(user, 'Option 32');

    await user.click(await screen.findByRole('button', { name: /retake the quiz/i }));

    await screen.findByText('Question 1 of 3');
    expect(screen.queryByTestId('quiz-reveal')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Option 32/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: /submit quiz/i })).toBeDisabled();
  });

  it('starting over returns to the pledge', async () => {
    const user = userEvent.setup();
    renderPreview();
    await reachTheQuiz(user);

    await user.click(screen.getByRole('button', { name: /start the preview over/i }));

    expect(
      await screen.findByRole('button', { name: /i agree, start the training/i }),
    ).toBeInTheDocument();
  });
});
