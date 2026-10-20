import { describe, it, expect, vi, type Mock } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { renderInTraining } from '@test/utils/renderTrainingAdmin';
import {
  createAdminQuestion,
  createAdminStep,
  createAdminTraining,
  createQuestionVersion,
  createSettings,
  createTopic,
} from '@test/utils/trainingAdminFactories';
import type { AdminQuestion, AdminStep } from '@/types/training-admin';
import { BlueprintEditor } from './BlueprintEditor';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { getTraining: vi.fn(), setBlueprint: vi.fn() },
}));

const api = trainingAdminAPI as unknown as { setBlueprint: Mock };

const topics = [
  createTopic({ id: 7, slug: 'safety', name: 'Safety', questionCount: 4 }),
  createTopic({ id: 8, slug: 'operation', name: 'Operation', questionCount: 2 }),
];

const question = (id: number, versionId: number, topicId: number): AdminQuestion =>
  createAdminQuestion({ id, topicId, latest: createQuestionVersion({ id: versionId }) });

// Safety has four questions; one is asked after a reading, so only three are eligible.
const questions = [
  question(1, 101, 7),
  question(2, 102, 7),
  question(3, 103, 7),
  question(4, 104, 7),
  question(5, 105, 8),
  question(6, 106, 8),
];

const reading = createAdminStep({ id: 1, position: 1, gateQuestionVersionId: 101 });
const quiz = (overrides: Partial<AdminStep> = {}) =>
  createAdminStep({ id: 3, position: 2, type: 'QUIZ', title: 'Final quiz', ...overrides });

async function open(step: AdminStep, randomDraw = false) {
  const onSaved = vi.fn();
  await renderInTraining(
    <BlueprintEditor
      versionId={100}
      step={step}
      topics={topics}
      questions={questions}
      steps={[reading, step]}
      onSaved={onSaved}
    />,
    {
      training: createAdminTraining({
        settings: createSettings({ randomDrawEnabled: randomDraw }),
      }),
    },
  );
  return { onSaved };
}

describe('BlueprintEditor', () => {
  it('shows each topic’s eligible count, leaving out questions asked inside the material', async () => {
    await open(quiz());

    await userEvent.click(screen.getByRole('button', { name: /add a topic/i }));

    expect(screen.getByTestId('eligible-7')).toHaveTextContent(
      '3 eligible questions (of 4 active in this topic)',
    );

    await userEvent.click(screen.getByRole('button', { name: /add a topic/i }));
    expect(screen.getByTestId('eligible-8')).toHaveTextContent('2 eligible questions');
  });

  it('uses the server’s count for a topic that is already in the blueprint', async () => {
    await open(
      quiz({ blueprint: [{ topicId: 7, topicSlug: 'safety', drawCount: 2, poolSize: 3 }] }),
    );

    expect(screen.getByTestId('eligible-7')).toHaveTextContent('3 eligible questions');
  });

  it('says everyone gets the same quiz when the random draw is off, and fixes the count', async () => {
    await open(quiz());
    await userEvent.click(screen.getByRole('button', { name: /add a topic/i }));

    expect(
      screen.getByText(/random draw is off, so everyone gets the same quiz/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /change in settings/i })).toHaveAttribute(
      'href',
      '/admin/training/1/settings',
    );
    const count = screen.getByRole('textbox', { name: 'Questions' });
    expect(count).toBeDisabled();
    expect(count).toHaveValue('3');
  });

  it('lets the draw be smaller when the random draw is on', async () => {
    api.setBlueprint.mockResolvedValue(
      quiz({ blueprint: [{ topicId: 7, topicSlug: 'safety', drawCount: 2, poolSize: 3 }] }),
    );
    const { onSaved } = await open(quiz(), true);
    expect(screen.getByText(/random draw is on/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add a topic/i }));

    await userEvent.type(screen.getByRole('textbox', { name: 'Questions' }), '2');
    await userEvent.click(screen.getByRole('button', { name: /save quiz topics/i }));

    await waitFor(() =>
      expect(api.setBlueprint).toHaveBeenCalledWith(100, 3, [{ topicId: 7, drawCount: 2 }]),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('asks for every eligible question when the count is left empty', async () => {
    api.setBlueprint.mockResolvedValue(quiz());
    await open(quiz(), true);
    await userEvent.click(screen.getByRole('button', { name: /add a topic/i }));

    await userEvent.click(screen.getByRole('button', { name: /save quiz topics/i }));

    await waitFor(() =>
      expect(api.setBlueprint).toHaveBeenCalledWith(100, 3, [{ topicId: 7, drawCount: null }]),
    );
  });

  it('does not offer a topic twice, and can remove one', async () => {
    await open(quiz());
    await userEvent.click(screen.getByRole('button', { name: /add a topic/i }));
    await userEvent.click(screen.getByRole('button', { name: /add a topic/i }));

    expect(screen.getByRole('button', { name: /add a topic/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /remove safety from the quiz/i }));
    expect(screen.getByRole('button', { name: /add a topic/i })).toBeEnabled();
  });

  it('shows the server’s complaint beside the row it is about', async () => {
    api.setBlueprint.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Validation failed', {
        errors: [
          {
            path: 'rules[0].drawCount',
            message: "Topic 'safety' has only 3 questions for the quiz; cannot draw 9",
          },
        ],
      }),
    );
    await open(quiz(), true);
    await userEvent.click(screen.getByRole('button', { name: /add a topic/i }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Questions' }), '9');

    await userEvent.click(screen.getByRole('button', { name: /save quiz topics/i }));

    expect(await screen.findByText(/cannot draw 9/i)).toBeInTheDocument();
  });

  it('says so when the training has no topics', async () => {
    await renderInTraining(
      <BlueprintEditor
        versionId={100}
        step={quiz()}
        topics={[]}
        questions={[]}
        steps={[quiz()]}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByText(/no topics yet\. add some on the questions page/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add a topic/i })).toBeDisabled();
  });
});
