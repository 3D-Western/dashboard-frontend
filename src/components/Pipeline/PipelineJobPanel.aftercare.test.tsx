import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { ApiError } from '@/api/client/errors';
import { CONFLICT_CODE, pipelineApi } from '@/api/client/pipeline';
import { skippedFollowups } from '@/lib/pipeline-aftercare';
import {
  createMockPickup,
  createMockPlan,
  createMockSnapshot,
} from '@test/utils/pipelineFactories';
import { PipelineJobPanel } from './PipelineJobPanel';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock('@/api/client/pipeline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client/pipeline')>()),
  pipelineApi: {
    getState: vi.fn(),
    stream: vi.fn(),
    saveInputs: vi.fn(),
    confirm: vi.fn(),
    choose: vi.fn(),
    report: vi.fn(),
    collected: vi.fn(),
    rate: vi.fn(),
    reportQuality: vi.fn(),
    answerFollowup: vi.fn(),
  },
}));

const api = vi.mocked(pipelineApi);
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const JOB = 'job-7';

const questions = [
  { questionId: 11, text: 'Did you notice any curling on the top overhang?' },
  { questionId: 12, text: 'Is the text on the front easy to read?' },
];

const collected = (overrides = {}) =>
  createMockSnapshot({ studentStatus: 'collected', plan: createMockPlan(), ...overrides });

beforeEach(() => {
  window.localStorage.clear();
  Object.values(api).forEach((fn) => fn.mockReset());
  vi.mocked(toast.error).mockClear();
  api.stream.mockImplementation(
    (_id, { signal }) =>
      new Promise<void>((resolve) => signal?.addEventListener('abort', () => resolve())),
  );
  // The backend answers every student action with the job's updated student view (202)
  api.collected.mockResolvedValue(collected());
  api.rate.mockResolvedValue(collected());
  api.reportQuality.mockResolvedValue(collected());
  api.answerFollowup.mockResolvedValue(collected());
});

describe('I have collected it', () => {
  it('is a clear button on the pickup card; tapping it tells the pipeline and moves on', async () => {
    api.getState
      .mockResolvedValueOnce(
        createMockSnapshot({
          studentStatus: 'ready_for_pickup',
          plan: createMockPlan(),
          pickup: createMockPickup(),
        }),
      )
      .mockResolvedValue(collected({ ratingPending: true }));
    render(<PipelineJobPanel jobId={JOB} jobName="Hinge Pair" />);

    await setup().click(await screen.findByRole('button', { name: /i've collected it/i }));

    expect(api.collected).toHaveBeenCalledWith(JOB);
    // Straight on to the one-tap rating, no extra screen in between
    expect(
      await screen.findByRole('heading', { name: /how did hinge pair turn out/i }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /i've collected it/i })).not.toBeInTheDocument();
  });

  it('shows the button even if the pickup details have not arrived', async () => {
    api.getState.mockResolvedValue(
      createMockSnapshot({ studentStatus: 'ready_for_pickup', plan: createMockPlan() }),
    );
    render(<PipelineJobPanel jobId={JOB} />);

    expect(await screen.findByRole('button', { name: /i've collected it/i })).toBeInTheDocument();
  });

  it('checks the job again, without scolding, when the pipeline says nothing is ready to collect', async () => {
    api.getState.mockResolvedValue(
      createMockSnapshot({
        studentStatus: 'ready_for_pickup',
        plan: createMockPlan(),
        pickup: createMockPickup(),
      }),
    );
    api.collected.mockRejectedValue(new ApiError(CONFLICT_CODE, 'Nothing is ready'));
    render(<PipelineJobPanel jobId={JOB} />);

    await setup().click(await screen.findByRole('button', { name: /i've collected it/i }));

    await waitFor(() => expect(api.getState).toHaveBeenCalledTimes(2));
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /i've collected it/i })).toBeEnabled();
  });

  it('lets the student tap again after a network failure', async () => {
    api.getState.mockResolvedValue(
      createMockSnapshot({
        studentStatus: 'ready_for_pickup',
        plan: createMockPlan(),
        pickup: createMockPickup(),
      }),
    );
    api.collected.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(collected());
    render(<PipelineJobPanel jobId={JOB} />);
    const user = setup();

    await user.click(await screen.findByRole('button', { name: /i've collected it/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /i've collected it/i }));

    expect(api.collected).toHaveBeenCalledTimes(2);
  });
});

describe('After collection', () => {
  it('thumbs up is one tap, then the follow-up questions come one at a time', async () => {
    api.getState.mockResolvedValue(collected({ followups: questions, ratingPending: true }));
    render(<PipelineJobPanel jobId={JOB} jobName="Hinge Pair" />);
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Good' }));

    expect(api.rate).toHaveBeenCalledWith(JOB, 'up');
    expect(api.reportQuality).not.toHaveBeenCalled();
    expect(await screen.findByText(questions[0].text)).toBeVisible();
    expect(screen.getByText('Quick question 1 of 2')).toBeVisible();
    expect(screen.queryByText(questions[1].text)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Yes' }));
    expect(api.answerFollowup).toHaveBeenCalledWith(JOB, 11, 'yes');

    expect(await screen.findByText(questions[1].text)).toBeVisible();
    expect(screen.getByText('Quick question 2 of 2')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Not sure' }));
    expect(api.answerFollowup).toHaveBeenLastCalledWith(JOB, 12, 'unsure');

    expect(await screen.findByText(/thanks, that helps/i)).toBeVisible();
    expect(screen.queryByTestId('after-pickup')).not.toBeInTheDocument();
  });

  it('thumbs down opens the optional quality step with reason chips and words', async () => {
    api.getState.mockResolvedValue(collected({ followups: [], ratingPending: true }));
    render(<PipelineJobPanel jobId={JOB} jobName="Hinge Pair" />);
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Not great' }));
    expect(api.rate).toHaveBeenCalledWith(JOB, 'down');
    expect(await screen.findByText(/help improve our system for everyone/i)).toBeVisible();

    const send = screen.getByRole('button', { name: 'Send' });
    expect(send).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Warped or curled' }));
    await user.click(screen.getByRole('button', { name: 'Weak or brittle' }));
    await user.type(
      screen.getByRole('textbox', { name: /anything else/i }),
      'Snapped at the hinge',
    );
    await user.click(send);

    expect(api.reportQuality).toHaveBeenCalledWith(JOB, {
      reasons: ['warping', 'weak'],
      text: 'Snapped at the hinge',
    });
    expect(await screen.findByText(/thanks, that helps/i)).toBeVisible();
  });

  it('sends words alone as "something else" so the report is never refused', async () => {
    api.getState.mockResolvedValue(collected({ followups: [], ratingPending: true }));
    render(<PipelineJobPanel jobId={JOB} />);
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Not great' }));
    await user.type(await screen.findByRole('textbox', { name: /anything else/i }), 'Smells odd');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(api.reportQuality).toHaveBeenCalledWith(JOB, { reasons: ['other'], text: 'Smells odd' });
  });

  it('the quality step can be skipped, and then the questions still follow', async () => {
    api.getState.mockResolvedValue(collected({ followups: questions, ratingPending: true }));
    render(<PipelineJobPanel jobId={JOB} />);
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Not great' }));
    await user.click(await screen.findByRole('button', { name: 'No thanks' }));

    expect(api.reportQuality).not.toHaveBeenCalled();
    expect(await screen.findByText(questions[0].text)).toBeVisible();
  });

  it('"Not now" skips the rating and is not asked again on the next visit', async () => {
    api.getState.mockResolvedValue(collected({ followups: [], ratingPending: true }));
    const first = render(<PipelineJobPanel jobId={JOB} />);
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(api.rate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
    first.unmount();

    render(<PipelineJobPanel jobId={JOB} />);
    await screen.findByRole('heading', { name: 'Collected' });
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
  });

  it('a skipped question is remembered and not asked again, the next one still is', async () => {
    api.getState.mockResolvedValue(collected({ followups: questions, ratingPending: false }));
    const first = render(<PipelineJobPanel jobId={JOB} />);
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Skip this one' }));
    expect(api.answerFollowup).not.toHaveBeenCalled();
    expect(skippedFollowups(JOB)).toEqual([11]);
    expect(await screen.findByText(questions[1].text)).toBeVisible();
    first.unmount();

    render(<PipelineJobPanel jobId={JOB} />);
    expect(await screen.findByText(questions[1].text)).toBeVisible();
    expect(screen.queryByText(questions[0].text)).not.toBeInTheDocument();
  });

  it('stays quiet when the print is already rated and nothing is left to ask', async () => {
    api.getState.mockResolvedValue(collected({ followups: [], ratingPending: false }));
    render(<PipelineJobPanel jobId={JOB} />);

    await screen.findByRole('heading', { name: 'Collected' });
    expect(screen.queryByTestId('after-pickup')).not.toBeInTheDocument();
    expect(screen.queryByText(/help improve/i)).not.toBeInTheDocument();
  });

  it('does not reopen the quality step on a later visit after a thumbs-down', async () => {
    api.getState.mockResolvedValue(collected({ followups: [], ratingPending: false }));
    render(<PipelineJobPanel jobId={JOB} />);

    await screen.findByRole('heading', { name: 'Collected' });
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
  });

  it('keeps the buttons for a second tap when saving the rating fails', async () => {
    api.getState.mockResolvedValue(collected({ followups: [], ratingPending: true }));
    api.rate.mockRejectedValueOnce(new Error('offline'));
    render(<PipelineJobPanel jobId={JOB} />);
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Good' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Good' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Good' }));
    expect(api.rate).toHaveBeenCalledTimes(2);
  });

  it('treats "already rated" (a conflict) as done instead of an error', async () => {
    api.getState.mockResolvedValue(collected({ followups: [], ratingPending: true }));
    api.rate.mockRejectedValue(new ApiError(CONFLICT_CODE, 'already rated'));
    render(<PipelineJobPanel jobId={JOB} />);

    await setup().click(await screen.findByRole('button', { name: 'Good' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument(),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('moves past a question the pipeline says was already answered', async () => {
    api.getState.mockResolvedValue(collected({ followups: questions, ratingPending: false }));
    api.answerFollowup.mockRejectedValueOnce(new ApiError(CONFLICT_CODE, 'already answered'));
    render(<PipelineJobPanel jobId={JOB} />);

    await setup().click(await screen.findByRole('button', { name: 'No' }));

    expect(await screen.findByText(questions[1].text)).toBeVisible();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('gives each question large tap targets in a labelled group', async () => {
    api.getState.mockResolvedValue(collected({ followups: questions, ratingPending: false }));
    render(<PipelineJobPanel jobId={JOB} />);

    const group = await screen.findByRole('group', { name: 'Your answer' });
    expect(group.querySelectorAll('button')).toHaveLength(3);
  });
});
