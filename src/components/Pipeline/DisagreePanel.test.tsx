import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { pipelineApi } from '@/api/client/pipeline';
import type { DisagreeAnswer } from '@/types/pipeline';
import { DisagreePanel } from './DisagreePanel';

vi.mock('@/api/client/pipeline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client/pipeline')>()),
  pipelineApi: { disagree: vi.fn(), escalateDisagree: vi.fn() },
}));

const api = vi.mocked(pipelineApi);
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });

function answer(overrides: Partial<DisagreeAnswer> = {}): DisagreeAnswer {
  return {
    requestId: 'r',
    turn: 1,
    status: 'answered',
    answer: 'The arm sticks out by more than 45 degrees, so we added supports.',
    askedAt: '2026-11-05T12:00:00Z',
    canEscalate: true,
    citations: [
      {
        entryId: 'card:overhang',
        kind: 'lesson_card',
        title: 'We added supports',
        code: 'overhang',
      },
      { entryId: 'numbers', kind: 'numbers', title: 'Print time and plastic' },
    ],
    planId: 'plan-1',
    questionsLeft: 7,
    ...overrides,
  };
}

/** A pending request the test settles by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const box = () => screen.getByLabelText('Your question');
const askButton = () => screen.getByRole('button', { name: 'Ask' });

beforeEach(() => {
  api.disagree.mockReset();
  api.escalateDisagree.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('DisagreePanel', () => {
  it('counts characters up to 600 and keeps Ask off until there is a question', async () => {
    const user = setup();
    render(<DisagreePanel jobId="job-1" currentPlanId="plan-1" />);

    expect(askButton()).toBeDisabled();
    expect(screen.getByText('0/600')).toBeInTheDocument();
    expect(box()).toHaveAttribute('maxlength', '600');

    await user.type(box(), 'Why?');
    expect(screen.getByText('4/600')).toBeInTheDocument();
    expect(askButton()).toBeEnabled();

    await user.clear(box());
    await user.type(box(), '   ');
    expect(askButton()).toBeDisabled();
  });

  it('shows the question and a typing indicator at once, then swaps in the answer with chips', async () => {
    const pending = deferred<DisagreeAnswer>();
    api.disagree.mockReturnValue(pending.promise);
    const user = setup();
    render(<DisagreePanel jobId="job-1" currentPlanId="plan-1" />);

    await user.type(box(), 'Why supports?');
    await user.click(askButton());

    // Optimistic: the question is on screen and the box is empty again, before any answer.
    expect(screen.getByText('Why supports?')).toBeInTheDocument();
    expect(box()).toHaveValue('');
    expect(screen.getByRole('status', { name: 'The assistant is typing' })).toBeInTheDocument();
    expect(api.disagree).toHaveBeenCalledWith('job-1', {
      requestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      text: 'Why supports?',
    });

    await act(async () => pending.resolve(answer()));

    expect(screen.queryByRole('status', { name: 'The assistant is typing' })).toBeNull();
    expect(screen.getByText(/we added supports\.$/)).toBeInTheDocument();
    const chips = within(screen.getByRole('list', { name: 'Based on' })).getAllByRole('listitem');
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'We added supports',
      'Print time and plastic',
    ]);
    expect(screen.getByText('7 questions left')).toBeInTheDocument();
    expect(screen.queryByText(/earlier version/)).toBeNull();
  });

  it('sends a double click once', async () => {
    const pending = deferred<DisagreeAnswer>();
    api.disagree.mockReturnValue(pending.promise);
    const user = setup();
    render(<DisagreePanel jobId="job-1" />);

    await user.type(box(), 'Why?');
    await user.dblClick(askButton());
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(api.disagree).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('Why?')).toHaveLength(1);
    // Typing the next question meanwhile is fine, but it waits for the first answer.
    await user.type(box(), 'And also?');
    expect(askButton()).toBeDisabled();
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(api.disagree).toHaveBeenCalledTimes(1);
  });

  it('retries a failed question under the same request id', async () => {
    api.disagree.mockRejectedValueOnce(new ApiError('REQUEST_FAILED', 'down'));
    api.disagree.mockResolvedValueOnce(answer({ answer: 'Here is why.' }));
    const user = setup();
    render(<DisagreePanel jobId="job-1" />);

    await user.type(box(), 'Why?');
    await user.click(askButton());
    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Here is why.')).toBeInTheDocument();
    expect(api.disagree).toHaveBeenCalledTimes(2);
    expect(api.disagree.mock.calls[1][1]).toEqual(api.disagree.mock.calls[0][1]);
    expect(screen.getAllByText('Why?')).toHaveLength(1);
  });

  it('uses a fresh request id for each new question', async () => {
    api.disagree.mockResolvedValue(answer());
    const user = setup();
    render(<DisagreePanel jobId="job-1" />);

    await user.type(box(), 'One');
    await user.click(askButton());
    await screen.findByText(/we added supports\./);
    await user.type(box(), 'Two');
    await user.click(askButton());
    await waitFor(() => expect(api.disagree).toHaveBeenCalledTimes(2));

    expect(api.disagree.mock.calls[1][1].requestId).not.toBe(
      api.disagree.mock.calls[0][1].requestId,
    );
  });

  it.each([
    ['not_in_record', 'That is not in your print record.'],
    ['declined', 'I can only explain decisions about this print.'],
    [
      'unavailable',
      "The explanation assistant isn't available right now. Please use Ask the crew.",
    ],
  ] as const)('shows %s as the assistant message and keeps Ask the crew', async (status, text) => {
    api.disagree.mockResolvedValue(
      answer({ status, answer: text, citations: [], questionsLeft: null }),
    );
    const user = setup();
    render(<DisagreePanel jobId="job-1" />);

    await user.type(box(), 'Hello');
    await user.click(askButton());

    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask the crew' })).toBeEnabled();
    expect(screen.queryByRole('list', { name: 'Based on' })).toBeNull();
  });

  it('shows rate_limited with the wait and the questions left', async () => {
    api.disagree.mockResolvedValue(
      answer({
        status: 'rate_limited',
        answer: "You've asked a lot of questions. Please wait a little.",
        retryAfterS: 90,
        questionsLeft: 0,
        citations: [],
      }),
    );
    const user = setup();
    render(<DisagreePanel jobId="job-1" />);

    await user.type(box(), 'Again');
    await user.click(askButton());

    expect(await screen.findByText(/Please wait a little/)).toBeInTheDocument();
    expect(screen.getByText('You can ask again in 2 minutes.')).toBeInTheDocument();
    expect(screen.getAllByText('No questions left for now.').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Ask the crew' })).toBeEnabled();
  });

  it('says so when an answer was about an earlier plan, and not when it is the current one', async () => {
    api.disagree.mockResolvedValue(answer({ planId: 'plan-1' }));
    const user = setup();
    const { rerender } = render(<DisagreePanel jobId="job-1" currentPlanId="plan-1" />);

    await user.type(box(), 'Why?');
    await user.click(askButton());
    await screen.findByText(/we added supports\./);
    expect(screen.queryByText(/earlier version of your plan/)).toBeNull();

    rerender(<DisagreePanel jobId="job-1" currentPlanId="plan-2" />);
    expect(screen.getByText(/earlier version of your plan/)).toBeInTheDocument();
  });

  it('shows only the student wording, never fields the assistant should not have sent', async () => {
    api.disagree.mockResolvedValue({
      ...answer(),
      staffNote: 'HOLD: screening flagged this',
      citations: [
        { entryId: 'card:x', kind: 'lesson_card', title: 'Chip title', code: 'verify.secret_code' },
      ],
    } as DisagreeAnswer);
    const user = setup();
    render(<DisagreePanel jobId="job-1" />);

    await user.type(box(), 'Why?');
    await user.click(askButton());
    await screen.findByText('Chip title');

    expect(document.body.textContent).not.toMatch(/screening|verify\.secret_code|entryId/);
  });

  it('writes nothing to browser storage', async () => {
    const local = vi.spyOn(Storage.prototype, 'setItem');
    api.disagree.mockResolvedValue(answer());
    api.escalateDisagree.mockResolvedValue(undefined);
    const user = setup();
    render(<DisagreePanel jobId="job-1" />);

    await user.type(box(), 'Why?');
    await user.click(askButton());
    await screen.findByText(/we added supports\./);
    await user.click(screen.getByRole('button', { name: 'Ask the crew' }));
    await user.click(screen.getByRole('button', { name: 'Send to the crew' }));
    await screen.findByText(/The crew has your question/);

    expect(local).not.toHaveBeenCalled();
    expect(document.cookie).toBe('');
  });
});

describe('Ask the crew', () => {
  it('is visible before any question, and one more click sends the optional reason', async () => {
    api.escalateDisagree.mockResolvedValue(undefined);
    const user = setup();
    render(<DisagreePanel jobId="job-1" />);

    await user.click(screen.getByRole('button', { name: 'Ask the crew' }));
    expect(api.escalateDisagree).not.toHaveBeenCalled();
    await user.type(
      screen.getByLabelText(/Anything to add for the crew/),
      'The supports ruined my part',
    );
    await user.click(screen.getByRole('button', { name: 'Send to the crew' }));

    expect(api.escalateDisagree).toHaveBeenCalledWith('job-1', 'The supports ruined my part');
    expect(await screen.findByText(/The crew has your question/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /crew/ })).toBeNull();
  });

  it('works with no reason, and only sends once on a double click', async () => {
    const pending = deferred<void>();
    api.escalateDisagree.mockReturnValue(pending.promise);
    const user = setup();
    render(<DisagreePanel jobId="job-1" />);

    await user.click(screen.getByRole('button', { name: 'Ask the crew' }));
    await user.dblClick(screen.getByRole('button', { name: 'Send to the crew' }));
    expect(api.escalateDisagree).toHaveBeenCalledTimes(1);
    expect(api.escalateDisagree).toHaveBeenCalledWith('job-1', '');

    await act(async () => pending.resolve());
    expect(await screen.findByText(/The crew has your question/)).toBeInTheDocument();
  });

  it('treats a 409 as already with the crew', async () => {
    api.escalateDisagree.mockRejectedValue(new ApiError('CONFLICT', 'Already escalated'));
    const user = setup();
    render(<DisagreePanel jobId="job-1" />);

    await user.click(screen.getByRole('button', { name: 'Ask the crew' }));
    await user.click(screen.getByRole('button', { name: 'Send to the crew' }));

    expect(await screen.findByText('This is already with the crew.')).toBeInTheDocument();
  });

  it('keeps the button and the reason on a failure so it can be tried again', async () => {
    api.escalateDisagree.mockRejectedValueOnce(new ApiError('REQUEST_FAILED', 'down'));
    api.escalateDisagree.mockResolvedValueOnce(undefined);
    const user = setup();
    render(<DisagreePanel jobId="job-1" />);

    await user.click(screen.getByRole('button', { name: 'Ask the crew' }));
    await user.type(screen.getByLabelText(/Anything to add for the crew/), 'Please look');
    await user.click(screen.getByRole('button', { name: 'Send to the crew' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn't reach the crew/);
    expect(screen.getByLabelText(/Anything to add for the crew/)).toHaveValue('Please look');

    await user.click(screen.getByRole('button', { name: 'Send to the crew' }));
    expect(await screen.findByText(/The crew has your question/)).toBeInTheDocument();
    expect(api.escalateDisagree).toHaveBeenLastCalledWith('job-1', 'Please look');
  });
});
