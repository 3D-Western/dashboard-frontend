import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { uploadVideo, readVideoDuration } from '@/lib/video-upload';
import { renderInTraining } from '@test/utils/renderTrainingAdmin';
import {
  createAdminQuestion,
  createAdminStep,
  createQuestionVersion,
  createTopic,
} from '@test/utils/trainingAdminFactories';
import type { AdminStep, StepType } from '@/types/training-admin';
import { StepDialog } from './StepDialog';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: {
    getTraining: vi.fn(),
    addStep: vi.fn(),
    updateStep: vi.fn(),
    setBlueprint: vi.fn(),
    createTopic: vi.fn(),
    createQuestion: vi.fn(),
  },
}));

vi.mock('@/lib/video-upload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/video-upload')>();
  return { ...actual, uploadVideo: vi.fn(), readVideoDuration: vi.fn() };
});

const api = trainingAdminAPI as unknown as {
  addStep: Mock;
  updateStep: Mock;
  setBlueprint: Mock;
  createTopic: Mock;
  createQuestion: Mock;
};

const topics = [createTopic({ id: 7, slug: 'safety', name: 'Safety', questionCount: 2 })];
const questions = [
  createAdminQuestion({
    id: 41,
    latest: createQuestionVersion({ id: 501, promptMarkdown: 'Where is the emergency stop?' }),
  }),
  createAdminQuestion({
    id: 42,
    latest: createQuestionVersion({ id: 502, promptMarkdown: 'Must the fan run?' }),
  }),
];

async function open(
  type: StepType,
  options: { step?: AdminStep | null; steps?: AdminStep[]; onSaved?: Mock } = {},
) {
  const onClose = vi.fn();
  const onSaved = options.onSaved ?? vi.fn();
  const onQuestionsChanged = vi.fn();
  await renderInTraining(
    <StepDialog
      versionId={100}
      trainingId={1}
      step={options.step ?? null}
      type={type}
      steps={options.steps ?? (options.step ? [options.step] : [])}
      topics={topics}
      questions={questions}
      onClose={onClose}
      onQuestionsChanged={onQuestionsChanged}
      onSaved={onSaved}
    />,
  );
  return { onClose, onSaved, onQuestionsChanged };
}

const title = () => screen.getByRole('textbox', { name: 'Title' });

beforeEach(() => {
  api.addStep.mockImplementation(async (_v: number, body: object) =>
    createAdminStep({ id: 77, ...body } as Partial<AdminStep>),
  );
  api.updateStep.mockImplementation(async (_v: number, id: number, body: object) =>
    createAdminStep({ id, ...body } as Partial<AdminStep>),
  );
});

describe('StepDialog video steps', () => {
  it('uploads a file, fills in its length, and saves the step with its checkpoints', async () => {
    (uploadVideo as unknown as Mock).mockResolvedValue('videos/intro.mp4');
    (readVideoDuration as unknown as Mock).mockResolvedValue(180);
    const { onClose, onSaved } = await open('VIDEO');

    await userEvent.type(title(), 'Meet the machine');
    await userEvent.upload(
      screen.getByLabelText(/choose a video file/i),
      new File([new Uint8Array(10)], 'intro.mp4', { type: 'video/mp4' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /video length/i })).toHaveValue('180'),
    );

    await userEvent.click(screen.getByRole('button', { name: /^add a question$/i }));
    await userEvent.type(screen.getByRole('textbox', { name: /question 1 appears at/i }), '95');
    await userEvent.selectOptions(screen.getByLabelText('Question 1'), '501');
    await userEvent.click(screen.getByRole('button', { name: /^add step$/i }));

    await waitFor(() => expect(api.addStep).toHaveBeenCalledTimes(1));
    expect(api.addStep).toHaveBeenCalledWith(100, {
      type: 'VIDEO',
      title: 'Meet the machine',
      addonScope: false,
      videoAssetKey: 'videos/intro.mp4',
      videoDurationSeconds: 180,
      minWatchPercent: 90,
      settings: {
        outcomes: ['watched'],
        checkpoints: [{ atSeconds: 95, questionVersionId: 501 }],
      },
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSaved).toHaveBeenCalled();
  });

  it('shows each checkpoint problem beside its row and saves nothing', async () => {
    await open('VIDEO');
    await userEvent.type(title(), 'Intro');
    await userEvent.type(screen.getByRole('textbox', { name: /video length/i }), '60');
    await userEvent.click(screen.getByRole('button', { name: /^add a question$/i }));
    await userEvent.type(screen.getByRole('textbox', { name: /question 1 appears at/i }), '90');

    await userEvent.click(screen.getByRole('button', { name: /^add step$/i }));

    expect(await screen.findByText(/must be inside the video \(0 to 60\)/i)).toBeInTheDocument();
    expect(screen.getByText(/choose the question to ask/i)).toBeInTheDocument();
    expect(api.addStep).not.toHaveBeenCalled();
  });

  it('will not offer a question twice in one video', async () => {
    await open('VIDEO');
    await userEvent.click(screen.getByRole('button', { name: /^add a question$/i }));
    await userEvent.selectOptions(screen.getByLabelText('Question 1'), '501');
    await userEvent.click(screen.getByRole('button', { name: /^add a question$/i }));

    const second = within(screen.getByLabelText('Question 2'));
    expect(second.getByRole('option', { name: /emergency stop/i })).toBeDisabled();
    expect(second.getByRole('option', { name: /must the fan run/i })).toBeEnabled();
  });

  it('shows the server’s checkpoint problem beside the checkpoint it names', async () => {
    api.updateStep.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Validation failed', {
        errors: [
          {
            path: 'settings.checkpoints[0].questionVersionId',
            message: 'That question is retired',
          },
          { path: 'minWatchPercent', message: 'Minimum watched must be between 1 and 100' },
          { path: 'steps', message: 'Something else' },
        ],
      }),
    );
    const step = createAdminStep({
      id: 11,
      type: 'VIDEO',
      title: 'Intro',
      videoAssetKey: 'videos/a.mp4',
      videoDurationSeconds: 120,
      settings: { outcomes: ['watched'], checkpoints: [{ atSeconds: 10, questionVersionId: 501 }] },
    });
    await open('VIDEO', { step });

    await userEvent.click(screen.getByRole('button', { name: /^save step$/i }));

    expect(await screen.findByText('That question is retired')).toBeInTheDocument();
    expect(screen.getByText('Minimum watched must be between 1 and 100')).toBeInTheDocument();
    expect(screen.getByText('The server found a problem')).toBeInTheDocument();
    expect(screen.getByText('Something else')).toBeInTheDocument();
  });

  it('keeps settings it does not know about when saving an existing video', async () => {
    const step = createAdminStep({
      id: 11,
      type: 'VIDEO',
      title: 'Intro',
      videoAssetKey: 'videos/a.mp4',
      videoDurationSeconds: 120,
      settings: { outcomes: ['watched'], checkpoints: [], tour: { stops: 2 } },
    });
    await open('VIDEO', { step });

    await userEvent.click(screen.getByRole('button', { name: /^save step$/i }));

    await waitFor(() => expect(api.updateStep).toHaveBeenCalled());
    expect(api.updateStep.mock.calls[0][2].settings).toMatchObject({ tour: { stops: 2 } });
  });

  it('can write a new question for a checkpoint, in an In-material topic it creates', async () => {
    api.createTopic.mockResolvedValue(
      createTopic({ id: 8, slug: 'in-material', name: 'In-material' }),
    );
    api.createQuestion.mockResolvedValue(
      createAdminQuestion({
        id: 50,
        topicId: 8,
        latest: createQuestionVersion({ id: 900, promptMarkdown: 'What did you just see?' }),
      }),
    );
    const { onQuestionsChanged } = await open('VIDEO');
    await userEvent.click(screen.getByRole('button', { name: /^add a question$/i }));
    await userEvent.click(screen.getByRole('button', { name: /write a new question/i }));

    const dialog = await screen.findByRole('dialog', { name: /add a question/i });
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Question' }),
      'What did you just see?',
    );
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Option 1 text' }), 'A laser');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Option 2 text' }), 'A saw');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove option 3' }));
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Option 1 is correct' }));
    await userEvent.click(within(dialog).getByRole('button', { name: /^add question$/i }));

    await waitFor(() =>
      expect(api.createTopic).toHaveBeenCalledWith(1, { slug: 'in-material', name: 'In-material' }),
    );
    await waitFor(() => expect(onQuestionsChanged).toHaveBeenCalled());
    expect(api.createQuestion).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ topicId: 8, promptMarkdown: 'What did you just see?' }),
    );
    // The new question is chosen for the checkpoint
    await waitFor(() => expect(screen.getByLabelText('Question 1')).toHaveValue('900'));
  });
});

describe('StepDialog reading steps', () => {
  it('previews the Markdown and saves the gate question', async () => {
    await open('READING');
    await userEvent.type(title(), 'Safe operation');
    const body = screen.getByRole('textbox', { name: 'Reading text' });
    await userEvent.click(body);
    await userEvent.paste('## Before you cut\n\nCheck the **fan**.');

    const preview = screen.getByLabelText('Reading text preview');
    expect(within(preview).getByRole('heading', { name: 'Before you cut' })).toBeInTheDocument();
    expect(within(preview).getByText('fan').tagName).toBe('STRONG');

    await userEvent.selectOptions(screen.getByLabelText(/question after the reading/i), '502');
    await userEvent.click(screen.getByRole('button', { name: /^add step$/i }));

    await waitFor(() => expect(api.addStep).toHaveBeenCalled());
    expect(api.addStep).toHaveBeenCalledWith(100, {
      type: 'READING',
      title: 'Safe operation',
      addonScope: false,
      bodyMarkdown: '## Before you cut\n\nCheck the **fan**.',
      gateQuestionVersionId: 502,
    });
  });

  it('marks a step as part of an add-on update', async () => {
    await open('READING');
    await userEvent.type(title(), 'New hazard');
    await userEvent.click(screen.getByRole('checkbox', { name: /part of an add-on update/i }));
    await userEvent.click(screen.getByRole('button', { name: /^add step$/i }));

    await waitFor(() => expect(api.addStep).toHaveBeenCalled());
    expect(api.addStep.mock.calls[0][1]).toMatchObject({ addonScope: true });
  });

  it('needs a title', async () => {
    await open('READING');

    await userEvent.click(screen.getByRole('button', { name: /^add step$/i }));

    expect(await screen.findByText('The step needs a title.')).toBeInTheDocument();
    expect(api.addStep).not.toHaveBeenCalled();
  });

  it('shows the server’s problem with the gate question', async () => {
    api.addStep.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Validation failed', {
        errors: [{ path: 'gateQuestionVersionId', message: 'That question is retired' }],
      }),
    );
    await open('READING');
    await userEvent.type(title(), 'Read');

    await userEvent.click(screen.getByRole('button', { name: /^add step$/i }));

    expect(await screen.findByText('That question is retired')).toBeInTheDocument();
  });

  it('saves changes to an existing step with a replace', async () => {
    const step = createAdminStep({ id: 12, title: 'Old title' });
    const { onClose } = await open('READING', { step });
    await userEvent.clear(title());
    await userEvent.type(title(), 'New title');

    await userEvent.click(screen.getByRole('button', { name: /^save step$/i }));

    await waitFor(() =>
      expect(api.updateStep).toHaveBeenCalledWith(
        100,
        12,
        expect.objectContaining({ title: 'New title' }),
      ),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('StepDialog attestation and quiz steps', () => {
  it('saves the statement a member agrees to', async () => {
    await open('ATTESTATION');
    await userEvent.type(title(), 'Understood');
    await userEvent.click(screen.getByRole('textbox', { name: /statement the member agrees to/i }));
    await userEvent.paste('I understand the risks.');
    await userEvent.click(screen.getByRole('button', { name: /^add step$/i }));

    await waitFor(() => expect(api.addStep).toHaveBeenCalled());
    expect(api.addStep.mock.calls[0][1]).toMatchObject({
      type: 'ATTESTATION',
      bodyMarkdown: 'I understand the risks.',
    });
  });

  it('adds a quiz, then stays open so its topics can be chosen', async () => {
    const created = createAdminStep({
      id: 77,
      type: 'QUIZ',
      title: 'Final quiz',
      bodyMarkdown: null,
    });
    api.addStep.mockResolvedValue(created);
    api.setBlueprint.mockResolvedValue({
      ...created,
      blueprint: [{ topicId: 7, topicSlug: 'safety', drawCount: 2, poolSize: 2 }],
    });
    const { onClose, onSaved } = await open('QUIZ');
    expect(screen.getByText(/save the step first/i)).toBeInTheDocument();

    await userEvent.type(title(), 'Final quiz');
    await userEvent.click(screen.getByRole('button', { name: /^add step$/i }));

    expect(await screen.findByRole('region', { name: 'Quiz topics' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(created);

    await userEvent.click(screen.getByRole('button', { name: /add a topic/i }));
    await userEvent.click(screen.getByRole('button', { name: /save quiz topics/i }));

    await waitFor(() =>
      expect(api.setBlueprint).toHaveBeenCalledWith(100, 77, [{ topicId: 7, drawCount: null }]),
    );
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });
});

describe('StepDialog unsaved changes', () => {
  it('asks before discarding edits to a step', async () => {
    const { onClose } = await open('READING');
    await userEvent.type(title(), 'Half written');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    const ask = await screen.findByRole('alertdialog');
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(within(ask).getByRole('button', { name: 'Keep editing' }));
    expect(title()).toHaveValue('Half written');
  });

  it('closes at once when nothing was changed', async () => {
    const { onClose } = await open('READING', { step: createAdminStep({ id: 12 }) });

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('does not ask to discard a quiz that was just saved', async () => {
    const created = createAdminStep({
      id: 77,
      type: 'QUIZ',
      title: 'Final quiz',
      bodyMarkdown: null,
    });
    api.addStep.mockResolvedValue(created);
    const { onClose } = await open('QUIZ');
    await userEvent.type(title(), 'Final quiz');
    await userEvent.click(screen.getByRole('button', { name: /^add step$/i }));
    await screen.findByRole('region', { name: 'Quiz topics' });

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('StepDialog video preview', () => {
  const uploaded = createAdminStep({
    id: 11,
    type: 'VIDEO',
    title: 'Intro',
    videoAssetKey: 'videos/a.mp4',
    videoDurationSeconds: 120,
    settings: { outcomes: ['watched'], checkpoints: [] },
  });

  it('offers to preview a video that is already uploaded', async () => {
    await open('VIDEO', { step: uploaded });

    expect(screen.getByRole('button', { name: /preview the uploaded video/i })).toBeInTheDocument();
  });

  it('offers no preview for a step without a file', async () => {
    await open('VIDEO');

    expect(
      screen.queryByRole('button', { name: /preview the uploaded video/i }),
    ).not.toBeInTheDocument();
  });
});
