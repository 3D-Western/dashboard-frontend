import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { ApiError } from '@/api/client/errors';
import { CONFLICT_CODE, pipelineApi } from '@/api/client/pipeline';
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
  { questionId: 13, text: 'Did the hinge move freely?' },
];

const afterPrint = (overrides = {}) =>
  createMockSnapshot({ studentStatus: 'collected', plan: createMockPlan(), ...overrides });

const ready = (overrides = {}) =>
  createMockSnapshot({
    studentStatus: 'ready_for_pickup',
    plan: createMockPlan(),
    pickup: createMockPickup(),
    ...overrides,
  });

beforeEach(() => {
  window.localStorage.clear();
  Object.values(api).forEach((fn) => fn.mockReset());
  vi.mocked(toast.error).mockClear();
  api.stream.mockImplementation(
    (_id, { signal }) =>
      new Promise<void>((resolve) => signal?.addEventListener('abort', () => resolve())),
  );
  // The backend answers every student action with the job's updated student view (202)
  api.rate.mockResolvedValue(afterPrint());
  api.reportQuality.mockResolvedValue(afterPrint());
  api.answerFollowup.mockResolvedValue(afterPrint());
});

describe('A print that is ready for pickup (collection is inferred, P-136)', () => {
  it('shows where and what, and has nothing to tap or confirm', async () => {
    api.getState.mockResolvedValue(ready({ ratingPending: false }));
    render(<PipelineJobPanel jobId={JOB} jobName="Hinge Pair" />);

    const card = await screen.findByTestId('pickup-card');
    expect(within(card).getByRole('heading', { name: /slot 14, tag k7q2/i })).toBeVisible();
    expect(within(card).getByRole('img', { name: /your finished print/i })).toBeVisible();
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /collected/i })).not.toBeInTheDocument();
    // Within the pickup grace nobody is asked how it turned out yet
    expect(screen.queryByTestId('after-pickup')).not.toBeInTheDocument();
  });

  it('is just as quiet when the pickup details have not arrived', async () => {
    api.getState.mockResolvedValue(
      createMockSnapshot({ studentStatus: 'ready_for_pickup', plan: createMockPlan() }),
    );
    render(<PipelineJobPanel jobId={JOB} />);

    await screen.findByRole('heading', { name: 'Ready' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers the one-tap rating next time the student is here, and rating it means collected', async () => {
    api.getState
      .mockResolvedValueOnce(ready({ ratingPending: true }))
      .mockResolvedValue(afterPrint({ ratingPending: false }));
    render(<PipelineJobPanel jobId={JOB} jobName="Hinge Pair" />);

    expect(
      await screen.findByRole('heading', { name: /how did hinge pair turn out/i }),
    ).toBeVisible();
    // The pickup details stay on screen above the rating
    expect(screen.getByTestId('pickup-card')).toBeVisible();

    await setup().click(screen.getByRole('button', { name: 'Good' }));

    expect(api.rate).toHaveBeenCalledWith(JOB, 'up');
    expect(await screen.findByRole('heading', { name: 'Collected' })).toBeVisible();
    expect(await screen.findByText(/thanks, that helps/i)).toBeVisible();
  });
});

describe('After the print', () => {
  it('rating and the (at most two) questions are one card: one tap for the thumb, one per question', async () => {
    api.getState.mockResolvedValue(afterPrint({ followups: questions, ratingPending: true }));
    render(<PipelineJobPanel jobId={JOB} jobName="Hinge Pair" />);
    const user = setup();

    const card = await screen.findByTestId('after-pickup');
    // Together, from the start: the rating, and the first two questions only
    expect(within(card).getByRole('button', { name: 'Good' })).toBeVisible();
    expect(within(card).getByText(questions[0].text)).toBeVisible();
    expect(within(card).getByText(questions[1].text)).toBeVisible();
    expect(within(card).queryByText(questions[2].text)).not.toBeInTheDocument();
    expect(screen.queryByText(/quick question \d of/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /skip|not now/i })).not.toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'Good' }));
    expect(api.rate).toHaveBeenCalledWith(JOB, 'up');
    expect(api.reportQuality).not.toHaveBeenCalled();

    const [yes] = screen.getAllByRole('button', { name: 'Yes' });
    await user.click(yes);
    expect(api.answerFollowup).toHaveBeenCalledWith(JOB, 11, 'yes');
    // Answering one never brings the third question in
    expect(screen.queryByText(questions[2].text)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Not sure' }));
    expect(api.answerFollowup).toHaveBeenLastCalledWith(JOB, 12, 'unsure');

    expect(await screen.findByText(/thanks, that helps/i)).toBeVisible();
    expect(screen.queryByTestId('after-pickup')).not.toBeInTheDocument();
  });

  it('thumbs down opens the optional quality step in the same card, with reason chips and words', async () => {
    api.getState.mockResolvedValue(afterPrint({ followups: [], ratingPending: true }));
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
    api.getState.mockResolvedValue(afterPrint({ followups: [], ratingPending: true }));
    render(<PipelineJobPanel jobId={JOB} />);
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Not great' }));
    await user.type(await screen.findByRole('textbox', { name: /anything else/i }), 'Smells odd');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(api.reportQuality).toHaveBeenCalledWith(JOB, { reasons: ['other'], text: 'Smells odd' });
  });

  it('the quality step is optional, and the questions are already there either way', async () => {
    api.getState.mockResolvedValue(afterPrint({ followups: questions, ratingPending: true }));
    render(<PipelineJobPanel jobId={JOB} />);
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Not great' }));
    await user.click(await screen.findByRole('button', { name: 'No thanks' }));

    expect(api.reportQuality).not.toHaveBeenCalled();
    expect(screen.getByText(questions[0].text)).toBeVisible();
    expect(screen.getByText(questions[1].text)).toBeVisible();
  });

  it('a print that is already rated only asks its questions, with no rating buttons', async () => {
    api.getState.mockResolvedValue(afterPrint({ followups: questions, ratingPending: false }));
    render(<PipelineJobPanel jobId={JOB} />);

    expect(await screen.findByRole('heading', { name: /two quick questions/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
  });

  it('stays quiet when the print is already rated and nothing is left to ask', async () => {
    api.getState.mockResolvedValue(afterPrint({ followups: [], ratingPending: false }));
    render(<PipelineJobPanel jobId={JOB} />);

    await screen.findByRole('heading', { name: 'Collected' });
    expect(screen.queryByTestId('after-pickup')).not.toBeInTheDocument();
    expect(screen.queryByText(/help improve/i)).not.toBeInTheDocument();
  });

  it('does not reopen the quality step on a later visit after a thumbs-down', async () => {
    api.getState.mockResolvedValue(afterPrint({ followups: [], ratingPending: false }));
    render(<PipelineJobPanel jobId={JOB} />);

    await screen.findByRole('heading', { name: 'Collected' });
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
  });

  it('keeps the buttons for a second tap when saving the rating fails', async () => {
    api.getState.mockResolvedValue(afterPrint({ followups: [], ratingPending: true }));
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
    api.getState.mockResolvedValue(afterPrint({ followups: [], ratingPending: true }));
    api.rate.mockRejectedValue(new ApiError(CONFLICT_CODE, 'already rated'));
    render(<PipelineJobPanel jobId={JOB} />);

    await setup().click(await screen.findByRole('button', { name: 'Good' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument(),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('counts a question the pipeline says was already answered as answered', async () => {
    api.getState.mockResolvedValue(afterPrint({ followups: questions, ratingPending: false }));
    api.answerFollowup.mockRejectedValueOnce(new ApiError(CONFLICT_CODE, 'already answered'));
    render(<PipelineJobPanel jobId={JOB} />);

    await setup().click((await screen.findAllByRole('button', { name: 'No' }))[0]);

    await waitFor(() => expect(screen.getAllByText('Thanks')).toHaveLength(1));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('gives each question large tap targets in its own labelled group', async () => {
    api.getState.mockResolvedValue(afterPrint({ followups: questions, ratingPending: false }));
    render(<PipelineJobPanel jobId={JOB} />);

    const groups = await screen.findAllByRole('group', { name: /your answer/i });
    expect(groups).toHaveLength(2);
    groups.forEach((group) => expect(group.querySelectorAll('button')).toHaveLength(3));
  });
});
