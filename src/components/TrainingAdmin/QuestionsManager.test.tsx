import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { renderInTraining } from '@test/utils/renderTrainingAdmin';
import {
  createAdminQuestion,
  createAdminStep,
  createAdminTraining,
  createQuestionVersion,
  createTopic,
  createVersionDetail,
  createVersionSummary,
} from '@test/utils/trainingAdminFactories';
import { QuestionsManager } from './QuestionsManager';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: {
    getTraining: vi.fn(),
    listTopics: vi.fn(),
    listQuestions: vi.fn(),
    getVersion: vi.fn(),
    deleteQuestion: vi.fn(),
    restoreQuestion: vi.fn(),
    createTopic: vi.fn(),
    updateTopic: vi.fn(),
    deleteTopic: vi.fn(),
    createQuestion: vi.fn(),
  },
}));

const api = trainingAdminAPI as unknown as Record<string, Mock>;

const topics = [
  createTopic({ id: 7, slug: 'safety', name: 'Safety', questionCount: 2 }),
  createTopic({ id: 8, slug: 'operation', name: 'Operation', questionCount: 0 }),
];
const questions = [
  createAdminQuestion({
    id: 41,
    topicId: 7,
    topicSlug: 'safety',
    versionCount: 3,
    latest: createQuestionVersion({
      id: 503,
      versionNo: 3,
      promptMarkdown: 'Where is the emergency stop?',
      critical: true,
    }),
  }),
  createAdminQuestion({
    id: 42,
    topicId: 7,
    topicSlug: 'safety',
    latest: createQuestionVersion({
      id: 504,
      promptMarkdown: 'Must the fan run?',
      type: 'TRUE_FALSE',
    }),
  }),
  createAdminQuestion({
    id: 43,
    topicId: 8,
    topicSlug: 'operation',
    active: false,
    latest: createQuestionVersion({ id: 505, promptMarkdown: 'An old question' }),
  }),
];

const training = createAdminTraining({
  currentVersionId: 90,
  versions: [createVersionSummary({ id: 90, status: 'PUBLISHED' })],
});

beforeEach(() => {
  api.listTopics.mockResolvedValue(topics);
  api.listQuestions.mockResolvedValue(questions);
  api.getVersion.mockResolvedValue(
    createVersionDetail([
      createAdminStep({ id: 1, position: 1, title: 'Meet the machine' }),
      createAdminStep({ id: 2, position: 2, title: 'Safe operation' }),
    ]),
  );
});

async function open() {
  await renderInTraining(<QuestionsManager />, { training });
  await screen.findByText('Where is the emergency stop?');
}

describe('QuestionsManager', () => {
  it('lists topics and active questions with their flags', async () => {
    await open();

    expect(screen.getByRole('heading', { name: 'Topics' })).toBeInTheDocument();
    expect(screen.getByText('Must the fan run?')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Version 3')).toBeInTheDocument();
    expect(screen.getByText('True or false')).toBeInTheDocument();
    expect(screen.queryByText('An old question')).not.toBeInTheDocument();
  });

  it('explains that editing a used question makes a new version', async () => {
    await open();

    expect(
      screen.getByText(/creates a new\s+version|new version, so past attempts keep the wording/i),
    ).toBeInTheDocument();
  });

  it('filters by topic and can show retired questions', async () => {
    await open();

    await userEvent.selectOptions(screen.getByLabelText('Show topic'), '8');
    expect(screen.queryByText('Must the fan run?')).not.toBeInTheDocument();
    expect(screen.getByText(/no questions to show/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /show retired/i }));
    expect(screen.getByText('An old question')).toBeInTheDocument();
    expect(screen.getByText('Retired')).toBeInTheDocument();
  });

  it('restores a retired question', async () => {
    api.restoreQuestion.mockResolvedValue(questions[2]);
    await open();
    await userEvent.click(screen.getByRole('checkbox', { name: /show retired/i }));

    await userEvent.click(screen.getByRole('button', { name: /restore/i }));

    await waitFor(() => expect(api.restoreQuestion).toHaveBeenCalledWith(43));
  });

  it('opens a question for editing with the steps it can send members back to', async () => {
    await open();

    await userEvent.click(
      screen.getByRole('button', { name: /edit question: where is the emergency stop/i }),
    );

    const dialog = await screen.findByRole('dialog', { name: /edit question/i });
    expect(within(dialog).getByRole('textbox', { name: 'Question' })).toHaveValue(
      'Where is the emergency stop?',
    );
    expect(
      within(dialog).getByRole('option', { name: 'Step 2: Safe operation' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/this question has 3 versions so far/i)).toBeInTheDocument();
  });

  it('adds a question to the topic being filtered', async () => {
    await open();
    await userEvent.selectOptions(screen.getByLabelText('Show topic'), '8');

    await userEvent.click(screen.getByRole('button', { name: /add a question/i }));

    const dialog = await screen.findByRole('dialog', { name: /add a question/i });
    expect(within(dialog).getByLabelText('Topic')).toHaveValue('8');
  });

  it('says whether a deleted question was removed or retired', async () => {
    api.deleteQuestion.mockResolvedValue({ deleted: false, retired: true });
    await open();

    await userEvent.click(
      screen.getByRole('button', { name: /delete question: where is the emergency stop/i }),
    );
    expect(screen.getByText(/is retired instead/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete question' }));

    await waitFor(() => expect(api.deleteQuestion).toHaveBeenCalledWith(41));
    await waitFor(() => expect(api.listQuestions).toHaveBeenCalledTimes(2));
  });

  it('shows why a question could not be deleted', async () => {
    api.deleteQuestion.mockRejectedValue(
      new ApiError('CONFLICT', 'A step of the draft still uses this question'),
    );
    await open();
    await userEvent.click(
      screen.getByRole('button', { name: /delete question: must the fan run/i }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Delete question' }));

    expect(
      await screen.findByText('A step of the draft still uses this question'),
    ).toBeInTheDocument();
  });
});

describe('QuestionsManager topics', () => {
  it('adds a topic with a slug made from its name', async () => {
    api.createTopic.mockResolvedValue(createTopic({ id: 9 }));
    await open();

    await userEvent.click(screen.getByRole('button', { name: /add a topic/i }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Machine set-up');
    expect(screen.getByRole('textbox', { name: /short name/i })).toHaveValue('machine-set-up');
    await userEvent.click(screen.getByRole('button', { name: /save topic/i }));

    await waitFor(() =>
      expect(api.createTopic).toHaveBeenCalledWith(1, {
        slug: 'machine-set-up',
        name: 'Machine set-up',
      }),
    );
  });

  it('renames a topic', async () => {
    api.updateTopic.mockResolvedValue(topics[0]);
    await open();

    await userEvent.click(screen.getByRole('button', { name: 'Rename Safety' }));
    const name = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Safety first');
    await userEvent.click(screen.getByRole('button', { name: /save topic/i }));

    await waitFor(() =>
      expect(api.updateTopic).toHaveBeenCalledWith(7, { slug: 'safety', name: 'Safety first' }),
    );
  });

  it('refuses a bad slug before sending it', async () => {
    await open();
    await userEvent.click(screen.getByRole('button', { name: /add a topic/i }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Set-up');
    const slug = screen.getByRole('textbox', { name: /short name/i });
    await userEvent.clear(slug);
    await userEvent.type(slug, 'Bad Slug');

    expect(
      screen.getByText(/lowercase letters and digits joined by single hyphens/i, {
        selector: '[role="alert"]',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save topic/i })).toBeDisabled();
  });

  it('explains why a topic in use cannot be deleted', async () => {
    api.deleteTopic.mockRejectedValue(new ApiError('CONFLICT', 'Topic Safety still has questions'));
    await open();

    await userEvent.click(screen.getByRole('button', { name: 'Delete topic Safety' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete topic' }));

    expect(await screen.findByText('Topic Safety still has questions')).toBeInTheDocument();
  });

  it('prompts to add a first topic when there are none', async () => {
    api.listTopics.mockResolvedValue([]);
    api.listQuestions.mockResolvedValue([]);
    await renderInTraining(<QuestionsManager />, { training });

    expect(await screen.findByText(/no topics yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no questions to show/i)).toBeInTheDocument();
  });
});
