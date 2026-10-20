import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import {
  createAdminQuestion,
  createQuestionVersion,
  createTopic,
} from '@test/utils/trainingAdminFactories';
import type { AdminQuestion } from '@/types/training-admin';
import { QuestionDialog } from './QuestionDialog';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { createQuestion: vi.fn(), updateQuestion: vi.fn(), createTopic: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const api = trainingAdminAPI as unknown as {
  createQuestion: Mock;
  updateQuestion: Mock;
  createTopic: Mock;
};

const topics = [
  createTopic({ id: 7, slug: 'safety', name: 'Safety' }),
  createTopic({ id: 8, slug: 'operation', name: 'Operation' }),
];
const steps = [
  { position: 1, title: 'Meet the machine' },
  { position: 2, title: 'Safe operation' },
];

function open(
  question: AdminQuestion | null = null,
  extra: Partial<Parameters<typeof QuestionDialog>[0]> = {},
) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <QuestionDialog
      trainingId={1}
      question={question}
      topics={topics}
      steps={steps}
      onClose={onClose}
      onSaved={onSaved}
      {...extra}
    />,
  );
  return { onClose, onSaved };
}

const prompt = () => screen.getByRole('textbox', { name: 'Question' });
const optionText = (n: number) => screen.getByRole('textbox', { name: `Option ${n} text` });
const submit = (label = /add question/i) =>
  userEvent.click(screen.getByRole('button', { name: label }));

beforeEach(() => {
  api.createQuestion.mockImplementation(
    async (_t: number, body: { topicId: number; promptMarkdown: string }) =>
      createAdminQuestion({
        topicId: body.topicId,
        latest: createQuestionVersion({ promptMarkdown: body.promptMarkdown }),
      }),
  );
});

describe('QuestionDialog adding', () => {
  it('will not save a question without a prompt or a correct option, and says what is missing', async () => {
    open();

    await submit();

    expect(await screen.findByText('The question needs a prompt.')).toBeInTheDocument();
    expect(screen.getByText('Every option needs text.')).toBeInTheDocument();
    expect(api.createQuestion).not.toHaveBeenCalled();
  });

  it('needs exactly one correct option for a single-answer question', async () => {
    open();
    await userEvent.type(prompt(), 'Where is the stop?');
    await userEvent.type(optionText(1), 'Front');
    await userEvent.type(optionText(2), 'Back');
    await userEvent.type(optionText(3), 'Nowhere');

    await submit();

    expect(await screen.findByText(/exactly one correct option/i)).toBeInTheDocument();
  });

  it('saves a single-answer question with the options and the review step', async () => {
    const { onSaved } = open();
    await userEvent.type(prompt(), 'Where is the stop?');
    await userEvent.type(optionText(1), 'Front');
    await userEvent.type(optionText(2), 'Back');
    await userEvent.type(optionText(3), 'Nowhere');
    await userEvent.click(screen.getByRole('radio', { name: 'Option 1 is correct' }));
    await userEvent.click(screen.getByRole('checkbox', { name: /critical question/i }));
    await userEvent.selectOptions(screen.getByLabelText(/send the member back to/i), '2');

    await submit();

    await waitFor(() => expect(api.createQuestion).toHaveBeenCalled());
    expect(api.createQuestion).toHaveBeenCalledWith(1, {
      topicId: 7,
      type: 'SINGLE',
      promptMarkdown: 'Where is the stop?',
      explanationMarkdown: null,
      critical: true,
      remediationStepPosition: 2,
      options: [
        { labelMarkdown: 'Front', correct: true },
        { labelMarkdown: 'Back', correct: false },
        { labelMarkdown: 'Nowhere', correct: false },
      ],
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('lets several options be correct in a multiple-answer question', async () => {
    open();
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'MULTI');
    await userEvent.type(prompt(), 'Which are banned?');
    await userEvent.type(optionText(1), 'PVC');
    await userEvent.type(optionText(2), 'Wood');
    await userEvent.type(optionText(3), 'Vinyl');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Option 1 is correct' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Option 3 is correct' }));

    await submit();

    await waitFor(() => expect(api.createQuestion).toHaveBeenCalled());
    expect(
      api.createQuestion.mock.calls[0][1].options.map((o: { correct: boolean }) => o.correct),
    ).toEqual([true, false, true]);
  });

  it('turns a true/false question into two fixed options', async () => {
    open();
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'TRUE_FALSE');

    expect(optionText(1)).toHaveValue('True');
    expect(optionText(1)).toHaveAttribute('readonly');
    expect(optionText(2)).toHaveValue('False');
    expect(screen.queryByRole('button', { name: /add an option/i })).not.toBeInTheDocument();

    await userEvent.type(prompt(), 'The fan must run.');
    await userEvent.click(screen.getByRole('radio', { name: 'Option 1 is correct' }));
    await submit();

    await waitFor(() => expect(api.createQuestion).toHaveBeenCalled());
    expect(api.createQuestion.mock.calls[0][1]).toMatchObject({
      type: 'TRUE_FALSE',
      options: [
        { labelMarkdown: 'True', correct: true },
        { labelMarkdown: 'False', correct: false },
      ],
    });
  });

  it('adds and removes options, between two and ten', async () => {
    open();
    expect(screen.getAllByRole('textbox', { name: /option \d text/i })).toHaveLength(3);

    await userEvent.click(screen.getByRole('button', { name: 'Remove option 3' }));
    expect(screen.getByRole('button', { name: 'Remove option 2' })).toBeDisabled();

    for (let i = 0; i < 8; i++) {
      await userEvent.click(screen.getByRole('button', { name: /add an option/i }));
    }
    expect(screen.getAllByRole('textbox', { name: /option \d+ text/i })).toHaveLength(10);
    expect(screen.getByRole('button', { name: /add an option/i })).toBeDisabled();
  });

  it('previews the Markdown of the question', async () => {
    open();
    await userEvent.click(prompt());
    await userEvent.paste('Is **this** safe?');

    expect(screen.getByLabelText('Question preview')).toHaveTextContent('Is this safe?');
  });

  it('shows what the server refused beside the options, and keeps the dialog open', async () => {
    api.createQuestion.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Validation failed', {
        errors: [{ path: 'options', message: 'A single-answer question needs 2 to 10 options' }],
      }),
    );
    const { onSaved } = open();
    await userEvent.type(prompt(), 'Q?');
    await userEvent.type(optionText(1), 'A');
    await userEvent.type(optionText(2), 'B');
    await userEvent.type(optionText(3), 'C');
    await userEvent.click(screen.getByRole('radio', { name: 'Option 1 is correct' }));

    await submit();

    expect(
      await screen.findByText('A single-answer question needs 2 to 10 options'),
    ).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe('QuestionDialog topics', () => {
  it('creates a new topic first, and does not create it twice when a retry is needed', async () => {
    api.createTopic.mockResolvedValue(
      createTopic({ id: 9, slug: 'in-material', name: 'In-material' }),
    );
    api.createQuestion
      .mockRejectedValueOnce(new ApiError('REQUEST_FAILED', 'offline'))
      .mockImplementation(async () => createAdminQuestion({ topicId: 9 }));
    open(null, { suggestedTopicName: 'In-material' });
    expect(screen.getByLabelText('Topic')).toHaveValue('__new__');
    await userEvent.type(prompt(), 'Q?');
    await userEvent.type(optionText(1), 'A');
    await userEvent.type(optionText(2), 'B');
    await userEvent.click(screen.getByRole('button', { name: 'Remove option 3' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Option 1 is correct' }));

    await submit();
    await screen.findByText(/reach the server/i);
    await submit();

    await waitFor(() => expect(api.createQuestion).toHaveBeenCalledTimes(2));
    expect(api.createTopic).toHaveBeenCalledTimes(1);
    expect(api.createTopic).toHaveBeenCalledWith(1, { slug: 'in-material', name: 'In-material' });
    expect(api.createQuestion.mock.calls[1][1].topicId).toBe(9);
  });

  it('starts on the topic it is given', () => {
    open(null, { defaultTopicId: 8 });

    expect(screen.getByLabelText('Topic')).toHaveValue('8');
  });
});

describe('QuestionDialog editing', () => {
  const existing = createAdminQuestion({
    id: 41,
    topicId: 7,
    versionCount: 2,
    latest: createQuestionVersion({
      id: 502,
      versionNo: 2,
      promptMarkdown: 'Where is the emergency stop?',
      critical: true,
      remediationStepPosition: 2,
    }),
  });

  it('says an unused question is edited in place', () => {
    open(existing);

    expect(screen.getByText(/nobody has been asked this question yet/i)).toHaveTextContent(
      /changes it in place and creates no new version/i,
    );
    expect(screen.queryByText(/saving creates a/i)).not.toBeInTheDocument();
  });

  it('starts from the current version and says that editing a used question makes a new version', () => {
    open({ ...existing, inUse: true });

    expect(prompt()).toHaveValue('Where is the emergency stop?');
    expect(optionText(1)).toHaveValue('On the front panel');
    expect(screen.getByRole('radio', { name: 'Option 1 is correct' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /critical question/i })).toBeChecked();
    expect(screen.getByLabelText(/send the member back to/i)).toHaveValue('2');
    expect(screen.getByText(/saving\s+creates a/i)).toHaveTextContent(/new version/i);
    expect(screen.getByText(/it has 2 versions? so far/i)).toBeInTheDocument();
  });

  it('sends the option ids back so an unused question keeps them', async () => {
    api.updateQuestion.mockResolvedValue({ ...existing });
    open(existing);

    await submit(/save question/i);

    await waitFor(() => expect(api.updateQuestion).toHaveBeenCalled());
    expect(api.updateQuestion.mock.calls[0][0]).toBe(41);
    expect(api.updateQuestion.mock.calls[0][1].options).toEqual([
      { id: 1, labelMarkdown: 'On the front panel', correct: true },
      { id: 2, labelMarkdown: 'Behind the machine', correct: false },
    ]);
    expect(toast.success).toHaveBeenCalledWith('Question saved.');
  });

  it('tells the author when the save made a new version', async () => {
    api.updateQuestion.mockResolvedValue({
      ...existing,
      versionCount: 3,
      latest: { ...existing.latest, versionNo: 3 },
    });
    open(existing);

    await submit(/save question/i);

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/saved as version 3/i)),
    );
  });

  it('explains that a published question cannot change topic', async () => {
    api.updateQuestion.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Validation failed', {
        errors: [{ path: 'topicId', message: 'A published question cannot move to another topic' }],
      }),
    );
    open(existing);
    await userEvent.selectOptions(screen.getByLabelText('Topic'), '8');

    await submit(/save question/i);

    expect(
      await screen.findByText('A published question cannot move to another topic'),
    ).toBeInTheDocument();
  });
});

describe('QuestionDialog unsaved changes', () => {
  it('closes at once when nothing changed', async () => {
    const { onClose } = open();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks before discarding a typed question', async () => {
    const { onClose } = open();
    await userEvent.type(prompt(), 'Half a question');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    const ask = await screen.findByRole('alertdialog');
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(within(ask).getByRole('button', { name: 'Discard changes' }));
    expect(onClose).toHaveBeenCalled();
  });
});
