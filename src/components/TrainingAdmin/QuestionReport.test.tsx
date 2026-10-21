import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { authorUser, publisherUser, renderInTraining } from '@test/utils/renderTrainingAdmin';
import {
  createAdminQuestion,
  createQuestionVersion,
  createReportRow,
} from '@test/utils/trainingAdminFactories';
import type { Correction, Rescore } from '@/types/training-admin';
import { QuestionReport, sortReport } from './QuestionReport';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: {
    getTraining: vi.fn(),
    getQuestionReport: vi.fn(),
    getQuestion: vi.fn(),
    listCorrections: vi.fn(),
    addCorrection: vi.fn(),
    previewCorrection: vi.fn(),
    rescore: vi.fn(),
  },
}));

const api = trainingAdminAPI as unknown as Record<string, Mock>;

const rows = [
  createReportRow({
    questionId: 1,
    questionVersionId: 501,
    promptMarkdown: 'Easy question',
    percentCorrect: 95,
  }),
  createReportRow({
    questionId: 2,
    questionVersionId: 502,
    promptMarkdown: 'Hard question',
    percentCorrect: 30,
  }),
  createReportRow({
    questionId: 3,
    questionVersionId: 503,
    promptMarkdown: 'Never asked',
    percentCorrect: null,
    timesShown: 0,
    timesAnswered: 0,
    timesCorrect: 0,
    mostChosenWrongOption: null,
    critical: true,
  }),
];

const noChange: Rescore = {
  passMarkPercent: 90,
  attemptsRescored: 12,
  changedOutcomes: [],
  skippedAnswers: 0,
};

const withChanges: Rescore = {
  passMarkPercent: 90,
  attemptsRescored: 12,
  skippedAnswers: 1,
  changedOutcomes: [
    {
      attemptId: 66,
      studentId: 251000123,
      trainingId: 1,
      storedStatus: 'FAILED',
      correctedPass: true,
      storedScorePercent: 85.7,
      correctedScorePercent: 92.9,
      criticalAllCorrect: true,
    },
    {
      attemptId: 67,
      studentId: 251000456,
      trainingId: 1,
      storedStatus: 'PASSED',
      correctedPass: false,
      storedScorePercent: 90,
      correctedScorePercent: 80,
      criticalAllCorrect: false,
    },
  ],
};

const correction = (overrides: Partial<Correction> = {}): Correction => ({
  id: 1,
  questionVersionId: 502,
  kind: 'ACCEPT_OPTION',
  optionId: 2,
  reason: 'Both answers are defensible',
  actor: 5,
  createdAt: '2026-10-20T12:00:00Z',
  ...overrides,
});

beforeEach(() => {
  api.previewCorrection.mockResolvedValue({
    attemptsAsked: 12,
    scoreChanged: 5,
    failToPass: 3,
    passToFail: 0,
    skippedAnswers: 0,
  });
  api.getQuestionReport.mockResolvedValue(rows);
  api.getQuestion.mockResolvedValue(
    createAdminQuestion({
      id: 2,
      versions: [
        createQuestionVersion({
          id: 502,
          options: [
            { id: 21, position: 1, labelMarkdown: 'On the front panel', correct: true },
            { id: 22, position: 2, labelMarkdown: 'On the side panel', correct: false },
          ],
        }),
      ],
    }),
  );
  api.listCorrections.mockResolvedValue([]);
});

describe('sortReport', () => {
  it('puts the hardest question first and the never-asked ones last', () => {
    expect(sortReport(rows).map((r) => r.questionId)).toEqual([2, 1, 3]);
  });
});

/**
 * A button on a table row. Below md the cards are in the DOM too (CSS shows one copy, and jsdom
 * applies no CSS), so row buttons are looked up inside the table.
 */
async function tableButton(name: RegExp) {
  return within(await screen.findByRole('table')).findByRole('button', { name });
}

describe('QuestionReport table', () => {
  it('shows each question with how it is doing, hardest first', async () => {
    await renderInTraining(<QuestionReport />);

    const table = await screen.findByRole('table');
    const bodyRows = within(table).getAllByRole('row').slice(1);
    expect(bodyRows[0]).toHaveTextContent('Hard question');
    expect(bodyRows[0]).toHaveTextContent('30%');
    expect(bodyRows[0]).toHaveTextContent('Look at this one');
    expect(bodyRows[0]).toHaveTextContent('Behind the machine');
    expect(bodyRows[0]).toHaveTextContent('9 times');
    expect(bodyRows[1]).toHaveTextContent('Easy question');
    expect(bodyRows[1]).not.toHaveTextContent('Look at this one');
    expect(bodyRows[2]).toHaveTextContent('n/a');
    expect(bodyRows[2]).toHaveTextContent('Critical');
  });

  it('says when nothing has been asked yet', async () => {
    api.getQuestionReport.mockResolvedValue([]);
    await renderInTraining(<QuestionReport />);

    expect(await screen.findByText(/no questions have been asked yet/i)).toBeInTheDocument();
  });

  it('offers corrections to someone who can publish', async () => {
    await renderInTraining(<QuestionReport />, { user: publisherUser() });

    const table = within(await screen.findByRole('table'));
    expect(await table.findAllByRole('button', { name: /^correct:/i })).toHaveLength(3);
    expect(table.getAllByRole('button', { name: /^re-score:/i })).toHaveLength(3);
  });

  it('hides corrections from someone who can only author, and says why', async () => {
    await renderInTraining(<QuestionReport />, { user: authorUser() });

    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: /^correct:/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^re-score:/i })).not.toBeInTheDocument();
    expect(
      screen.getByText(/recording a correction needs the "publish trainings" permission/i),
    ).toBeInTheDocument();
  });
});

describe('QuestionReport corrections', () => {
  /** Presses "Record correction" and then confirms in the dialog that states the effect. */
  async function recordAndConfirm(dialog: HTMLElement) {
    await userEvent.click(within(dialog).getByRole('button', { name: /record correction/i }));
    const confirm = await screen.findByRole('alertdialog');
    await within(confirm).findByText(/this changes the score/i);
    await userEvent.click(within(confirm).getByRole('button', { name: /record correction/i }));
  }

  async function openCorrection() {
    await renderInTraining(<QuestionReport />, { user: publisherUser() });
    await userEvent.click(await tableButton(/^correct: hard question/i));
    return screen.findByRole('dialog', { name: /correct this question/i });
  }

  it('accepts another option with a reason and shows the read-only re-score', async () => {
    api.addCorrection.mockResolvedValue(correction({ rescore: withChanges }));
    const dialog = await openCorrection();
    await within(dialog).findByRole('option', { name: 'On the side panel' });
    expect(
      within(dialog).getByRole('option', { name: /on the front panel \(already correct\)/i }),
    ).toBeDisabled();

    await userEvent.selectOptions(
      within(dialog).getByLabelText(/which answer should also count/i),
      '22',
    );
    await userEvent.type(within(dialog).getByLabelText('Reason'), '  Both are defensible ');
    await recordAndConfirm(dialog);

    await waitFor(() =>
      expect(api.addCorrection).toHaveBeenCalledWith(502, {
        kind: 'ACCEPT_OPTION',
        optionId: 22,
        reason: 'Both are defensible',
      }),
    );
    const result = await within(dialog).findByRole('region', { name: /re-score result/i });
    expect(within(result).getByText('Nothing has been changed')).toBeInTheDocument();
    expect(within(result).getByText(/2 results would change/i)).toBeInTheDocument();
    expect(within(result).getByText('251000123')).toBeInTheDocument();
    expect(within(result).getByText('Would pass')).toBeInTheDocument();
    expect(within(result).getByText('85.7% to 92.9%')).toBeInTheDocument();
    expect(within(result).getByText('Would fail')).toBeInTheDocument();
    expect(within(result).getByText(/a critical question is wrong/i)).toBeInTheDocument();
    expect(within(result).getByText(/1 stored answer could not be read/i)).toBeInTheDocument();
    // The report is reloaded to show the correction count
    await waitFor(() => expect(api.getQuestionReport).toHaveBeenCalledTimes(2));
  });

  it('drops the question, which needs no option, but still needs a reason', async () => {
    api.addCorrection.mockResolvedValue(
      correction({ kind: 'DROP_QUESTION', optionId: null, rescore: noChange }),
    );
    const dialog = await openCorrection();

    await userEvent.click(within(dialog).getByRole('radio', { name: /drop the question/i }));
    expect(
      within(dialog).queryByLabelText(/which answer should also count/i),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /record correction/i })).toBeDisabled();

    await userEvent.type(within(dialog).getByLabelText('Reason'), 'The question was wrong');
    await recordAndConfirm(dialog);

    await waitFor(() =>
      expect(api.addCorrection).toHaveBeenCalledWith(502, {
        kind: 'DROP_QUESTION',
        reason: 'The question was wrong',
      }),
    );
    expect(
      await within(dialog).findByText(/no attempt.s result would change/i),
    ).toBeInTheDocument();
  });

  it('will not record an accept-option correction until an option is chosen', async () => {
    const dialog = await openCorrection();
    await within(dialog).findByRole('option', { name: 'On the side panel' });

    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Because');

    expect(within(dialog).getByRole('button', { name: /record correction/i })).toBeDisabled();
  });

  it('shows earlier corrections of the question', async () => {
    api.listCorrections.mockResolvedValue([
      correction({ reason: 'Dropped last term', kind: 'DROP_QUESTION' }),
    ]);
    const dialog = await openCorrection();

    const history = await within(dialog).findByRole('region', { name: /earlier corrections/i });
    expect(history).toHaveTextContent('Dropped the question');
    expect(history).toHaveTextContent('Dropped last term');
  });

  it('shows what the server refused', async () => {
    api.addCorrection.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Validation failed', {
        errors: [{ path: 'optionId', message: 'That option does not belong to this question' }],
      }),
    );
    const dialog = await openCorrection();
    await within(dialog).findByRole('option', { name: 'On the side panel' });
    await userEvent.selectOptions(
      within(dialog).getByLabelText(/which answer should also count/i),
      '22',
    );
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Because');

    await recordAndConfirm(dialog);

    expect(
      await within(dialog).findByText('That option does not belong to this question'),
    ).toBeInTheDocument();
  });
});

describe('QuestionReport correction confirmation', () => {
  async function ready(kind: 'ACCEPT_OPTION' | 'DROP_QUESTION') {
    await renderInTraining(<QuestionReport />, { user: publisherUser() });
    await userEvent.click(await tableButton(/^correct: hard question/i));
    const dialog = await screen.findByRole('dialog', { name: /correct this question/i });
    await within(dialog).findByRole('option', { name: 'On the side panel' });
    if (kind === 'DROP_QUESTION') {
      await userEvent.click(within(dialog).getByRole('radio', { name: /drop the question/i }));
    } else {
      await userEvent.selectOptions(
        within(dialog).getByLabelText(/which answer should also count/i),
        '22',
      );
    }
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Because');
    await userEvent.click(within(dialog).getByRole('button', { name: /record correction/i }));
    const confirm = await screen.findByRole('alertdialog');
    await within(confirm).findByTestId('correction-effect');
    return confirm;
  }

  it('states the effect of accepting another answer, and records nothing until confirmed', async () => {
    const confirm = await ready('ACCEPT_OPTION');

    expect(confirm).toHaveTextContent(/“On the side panel” also counts as correct/);
    expect(confirm).toHaveTextContent(/cannot be undone/i);
    expect(confirm).toHaveTextContent(
      /no one.s record, certification or access changes by itself/i,
    );
    expect(api.addCorrection).not.toHaveBeenCalled();
  });

  it('states the effect of dropping a question', async () => {
    const confirm = await ready('DROP_QUESTION');

    expect(confirm).toHaveTextContent(/no longer counts toward anyone.s score/i);
    expect(confirm).toHaveTextContent(/left out of new quizzes/i);
  });

  it('says how many past attempts it changes and how many would flip to a pass', async () => {
    const confirm = await ready('ACCEPT_OPTION');

    await within(confirm).findByText(
      'This changes the score of 5 past attempts; 3 would change from fail to pass.',
    );
    expect(api.previewCorrection).toHaveBeenCalledWith(502, {
      kind: 'ACCEPT_OPTION',
      optionId: 22,
      reason: 'Because',
    });
  });

  it('also says when some would change from pass to fail', async () => {
    api.previewCorrection.mockResolvedValue({
      attemptsAsked: 4,
      scoreChanged: 4,
      failToPass: 1,
      passToFail: 2,
      skippedAnswers: 0,
    });
    const confirm = await ready('DROP_QUESTION');

    await within(confirm).findByText(/2 would change from pass to fail/);
    expect(api.previewCorrection).toHaveBeenCalledWith(502, {
      kind: 'DROP_QUESTION',
      reason: 'Because',
    });
  });

  it('says when nobody has been asked the question yet', async () => {
    api.previewCorrection.mockResolvedValue({
      attemptsAsked: 0,
      scoreChanged: 0,
      failToPass: 0,
      passToFail: 0,
      skippedAnswers: 0,
    });
    const confirm = await ready('DROP_QUESTION');

    await within(confirm).findByText(/no one has been asked this question yet/i);
  });

  it('will not record until the numbers are known, and offers another try if they fail', async () => {
    api.previewCorrection.mockRejectedValueOnce(new ApiError('REQUEST_FAILED', 'offline'));
    const confirm = await ready('DROP_QUESTION');

    await within(confirm).findByText(/couldn.t work out what this would change|reach the server/i);
    expect(within(confirm).getByRole('button', { name: /record correction/i })).toBeDisabled();
    await userEvent.click(within(confirm).getByRole('button', { name: /try again/i }));

    await within(confirm).findByText(/this changes the score of 5/i);
    expect(within(confirm).getByRole('button', { name: /record correction/i })).toBeEnabled();
    expect(api.addCorrection).not.toHaveBeenCalled();
  });

  it('records nothing when the user goes back', async () => {
    const confirm = await ready('DROP_QUESTION');

    await userEvent.click(within(confirm).getByRole('button', { name: /go back/i }));

    expect(api.addCorrection).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('QuestionReport re-scoring', () => {
  it('re-scores without recording anything and lists the attempts that would change', async () => {
    api.rescore.mockResolvedValue(withChanges);
    await renderInTraining(<QuestionReport />, { user: publisherUser() });

    await userEvent.click(await tableButton(/^re-score: hard question/i));

    const dialog = await screen.findByRole('dialog', { name: /re-score attempts/i });
    expect(await within(dialog).findByText('#66')).toBeInTheDocument();
    expect(api.rescore).toHaveBeenCalledWith(502);
    expect(api.addCorrection).not.toHaveBeenCalled();
    expect(within(dialog).queryByLabelText('Reason')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Failed')).toBeInTheDocument();
  });

  it('says when no one is affected', async () => {
    api.rescore.mockResolvedValue(noChange);
    await renderInTraining(<QuestionReport />, { user: publisherUser() });

    await userEvent.click(await tableButton(/^re-score: hard question/i));

    expect(await screen.findByText(/12 attempts re-scored/i)).toBeInTheDocument();
    expect(screen.getByText(/no attempt.s result would change/i)).toBeInTheDocument();
  });

  it('shows why the question could not be loaded', async () => {
    api.getQuestion.mockRejectedValue(new ApiError('NOT_FOUND', 'gone'));
    await renderInTraining(<QuestionReport />, { user: publisherUser() });

    await userEvent.click(await tableButton(/^re-score: hard question/i));

    expect(await screen.findByText(/no longer exists/i)).toBeInTheDocument();
  });
});

// jsdom applies no CSS, so the switch is checked through the classes that CSS acts on: the cards
// wrapper hides from the breakpoint up, the table wrapper hides below it.
function expectCardsBelowLg() {
  expect(screen.getByRole('list').parentElement).toHaveClass('lg:hidden');
  expect(screen.getByRole('table').closest('[class~="lg:block"]')).toHaveClass('hidden');
}

describe('QuestionReport on a phone', () => {
  it('shows each question as a card with its numbers, and no table', async () => {
    await renderInTraining(<QuestionReport />, { user: publisherUser() });

    const cards = within(await screen.findByRole('list')).getAllByRole('listitem');
    expect(cards).toHaveLength(3);
    expectCardsBelowLg();

    expect(cards[0]).toHaveTextContent('Hard question');
    expect(cards[0]).toHaveTextContent('Look at this one');
    expect(cards[0]).toHaveTextContent('Asked');
    expect(cards[0]).toHaveTextContent('30%');
    expect(cards[0]).toHaveTextContent('9 times');
    expect(cards[2]).toHaveTextContent('n/a');
  });

  it('keeps cards on an iPad held upright, where the table is too wide', async () => {
    await renderInTraining(<QuestionReport />, { user: publisherUser() });

    expect(within(await screen.findByRole('list')).getAllByRole('listitem')).toHaveLength(3);
    expectCardsBelowLg();
  });

  it('puts the correction buttons full width on each card, at 44 px', async () => {
    await renderInTraining(<QuestionReport />, { user: publisherUser() });

    const cards = within(await screen.findByRole('list')).getAllByRole('listitem');
    const correct = within(cards[0]).getByRole('button', { name: /^correct:/i });
    const rescore = within(cards[0]).getByRole('button', { name: /^re-score:/i });
    expect(correct).toHaveClass('h-11', 'w-full');
    expect(rescore).toHaveClass('h-11', 'w-full');
  });

  it('opens the correction dialog from a card', async () => {
    await renderInTraining(<QuestionReport />, { user: publisherUser() });

    const cards = within(await screen.findByRole('list')).getAllByRole('listitem');
    await userEvent.click(within(cards[0]).getByRole('button', { name: /^correct:/i }));

    expect(
      await screen.findByRole('dialog', { name: /correct this question/i }),
    ).toBeInTheDocument();
  });
});
