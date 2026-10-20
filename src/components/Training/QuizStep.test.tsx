import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAPI } from '@/api/client/training';
import { createQuestion } from '@test/utils/trainingFactories';
import type { AttemptStep, QuizResult } from '@/types/training';
import { QuizStep } from './QuizStep';

vi.mock('@/api/client/training', () => ({
  trainingAPI: {
    openQuiz: vi.fn(),
    saveQuizAnswers: vi.fn(),
    submitQuiz: vi.fn(),
  },
}));

const api = trainingAPI as unknown as { openQuiz: Mock; saveQuizAnswers: Mock; submitQuiz: Mock };

const quizStep: AttemptStep = {
  stepId: 9,
  position: 3,
  type: 'QUIZ',
  title: 'Final quiz',
  status: 'AVAILABLE',
  addonScope: false,
  quiz: { opened: false, questionCount: 3, answeredCount: 0 },
};

const questions = [
  createQuestion({
    questionVersionId: 101,
    promptMarkdown: 'First question?',
    options: [
      { optionId: 1, label: 'Alpha' },
      { optionId: 2, label: 'Beta' },
    ],
  }),
  createQuestion({
    questionVersionId: 102,
    type: 'MULTI',
    selection: 'MULTIPLE',
    promptMarkdown: 'Second question?',
    options: [
      { optionId: 3, label: 'Gamma' },
      { optionId: 4, label: 'Delta' },
      { optionId: 5, label: 'Epsilon' },
    ],
  }),
  createQuestion({
    questionVersionId: 103,
    type: 'TRUE_FALSE',
    promptMarkdown: 'Third question?',
    options: [
      { optionId: 6, label: 'True' },
      { optionId: 7, label: 'False' },
    ],
  }),
];

const passed: QuizResult = {
  passed: true,
  scorePercent: 100,
  criticalAllCorrect: true,
  passMarkPercent: 90,
  attemptStatus: 'PASSED',
  reviewSteps: [],
  certificationStatus: 'ACTIVE',
  retryAt: null,
};

beforeEach(() => {
  api.openQuiz.mockResolvedValue({ stepId: 9, questions });
  api.saveQuizAnswers.mockResolvedValue({ stepId: 9, questions });
  api.submitQuiz.mockResolvedValue(passed);
});

describe('QuizStep', () => {
  it('opens the quiz and shows one question at a time with progress', async () => {
    render(<QuizStep attemptId={1} step={quizStep} onSubmitted={vi.fn()} />);

    expect(await screen.findByText('First question?')).toBeInTheDocument();
    expect(api.openQuiz).toHaveBeenCalledWith(1, 9);
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    expect(screen.queryByText('Second question?')).not.toBeInTheDocument();
    expect(screen.getByText(/3 questions are still blank/i)).toBeInTheDocument();
  });

  it('uses radio buttons for single choice and checkboxes for pick-all-that-apply', async () => {
    render(<QuizStep attemptId={1} step={quizStep} onSubmitted={vi.fn()} />);
    await screen.findByText('First question?');
    expect(screen.getByLabelText('Alpha')).toHaveAttribute('type', 'radio');

    await userEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByText('Second question?')).toBeInTheDocument();
    expect(screen.getByLabelText('Gamma')).toHaveAttribute('type', 'checkbox');
    expect(screen.getByText(/select all that apply/i)).toBeInTheDocument();
  });

  it('saves answers as you go, without grading', async () => {
    render(<QuizStep attemptId={1} step={quizStep} onSubmitted={vi.fn()} />);
    await screen.findByText('First question?');

    await userEvent.click(screen.getByLabelText('Beta'));

    await waitFor(() => expect(api.saveQuizAnswers).toHaveBeenCalledTimes(1));
    expect(api.saveQuizAnswers).toHaveBeenLastCalledWith(1, 9, [
      { questionVersionId: 101, optionIds: [2] },
    ]);
    expect(await screen.findByText(/answers saved/i)).toBeInTheDocument();
    expect(api.submitQuiz).not.toHaveBeenCalled();

    // A second answer saves everything answered so far
    await userEvent.click(screen.getByRole('button', { name: /^next$/i }));
    await userEvent.click(await screen.findByLabelText('Gamma'));
    await userEvent.click(screen.getByLabelText('Epsilon'));
    await waitFor(() => expect(api.saveQuizAnswers).toHaveBeenCalledTimes(3));
    expect(api.saveQuizAnswers).toHaveBeenLastCalledWith(1, 9, [
      { questionVersionId: 101, optionIds: [2] },
      { questionVersionId: 102, optionIds: [3, 5] },
    ]);
  });

  it('resumes: restores saved answers and lands on the first blank question', async () => {
    api.openQuiz.mockResolvedValue({
      stepId: 9,
      questions: [
        { ...questions[0], selectedOptionIds: [1] },
        { ...questions[1], selectedOptionIds: [4] },
        questions[2],
      ],
    });
    render(<QuizStep attemptId={1} step={quizStep} onSubmitted={vi.fn()} />);

    expect(await screen.findByText('Third question?')).toBeInTheDocument();
    expect(screen.getByText('Question 3 of 3')).toBeInTheDocument();
    expect(screen.getByText(/1 question is still blank/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Question 1, answered' })).toBeInTheDocument();

    // earlier answers are still there
    await userEvent.click(screen.getByRole('button', { name: 'Question 1, answered' }));
    expect(await screen.findByLabelText('Alpha')).toBeChecked();
  });

  it('keeps Submit disabled until every question is answered', async () => {
    render(<QuizStep attemptId={1} step={quizStep} onSubmitted={vi.fn()} />);
    await screen.findByText('First question?');
    const submit = screen.getByRole('button', { name: /submit quiz/i });
    expect(submit).toBeDisabled();

    await userEvent.click(screen.getByLabelText('Alpha'));
    await userEvent.click(screen.getByRole('button', { name: 'Question 2, not answered' }));
    await userEvent.click(await screen.findByLabelText('Delta'));
    expect(submit).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Question 3, not answered' }));
    await userEvent.click(await screen.findByLabelText('True'));
    expect(submit).toBeEnabled();
  });

  it('submits all answers and hands the graded result on', async () => {
    const onSubmitted = vi.fn();
    render(<QuizStep attemptId={1} step={quizStep} onSubmitted={onSubmitted} />);
    await screen.findByText('First question?');

    await userEvent.click(screen.getByLabelText('Alpha'));
    await userEvent.click(screen.getByRole('button', { name: 'Question 2, not answered' }));
    await userEvent.click(await screen.findByLabelText('Delta'));
    await userEvent.click(screen.getByRole('button', { name: 'Question 3, not answered' }));
    await userEvent.click(await screen.findByLabelText('False'));
    await userEvent.click(screen.getByRole('button', { name: /submit quiz/i }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(passed));
    expect(api.submitQuiz).toHaveBeenCalledWith(1, 9, [
      { questionVersionId: 101, optionIds: [1] },
      { questionVersionId: 102, optionIds: [4] },
      { questionVersionId: 103, optionIds: [7] },
    ]);
  });

  it('never shows which answers were right: there is no correctness marker on any option', async () => {
    render(<QuizStep attemptId={1} step={quizStep} onSubmitted={vi.fn()} />);
    await screen.findByText('First question?');
    await userEvent.click(screen.getByLabelText('Alpha'));

    expect(screen.queryByText(/correct|incorrect|wrong|right answer/i)).not.toBeInTheDocument();
  });

  it('explains an incomplete quiz and jumps to the first blank question', async () => {
    api.submitQuiz.mockRejectedValue(new ApiError('QUIZ_INCOMPLETE', 'x', { unanswered: [103] }));
    api.openQuiz.mockResolvedValue({
      stepId: 9,
      questions: [
        { ...questions[0], selectedOptionIds: [1] },
        { ...questions[1], selectedOptionIds: [4] },
        { ...questions[2], selectedOptionIds: [6] },
      ],
    });
    render(<QuizStep attemptId={1} step={quizStep} onSubmitted={vi.fn()} />);
    await screen.findByText('First question?');

    await userEvent.click(screen.getByRole('button', { name: /submit quiz/i }));

    expect(await screen.findByText(/answer every question before submitting/i)).toBeInTheDocument();
  });

  it('offers a retry when the quiz cannot be loaded', async () => {
    api.openQuiz.mockRejectedValueOnce(new ApiError('STEP_LOCKED'));
    render(<QuizStep attemptId={1} step={quizStep} onSubmitted={vi.fn()} />);

    expect(await screen.findByText(/finish the earlier steps first/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('First question?')).toBeInTheDocument();
  });

  it('says so when saving fails, and does not lose the answer on screen', async () => {
    api.saveQuizAnswers.mockRejectedValueOnce(new Error('offline'));
    render(<QuizStep attemptId={1} step={quizStep} onSubmitted={vi.fn()} />);
    await screen.findByText('First question?');

    await userEvent.click(screen.getByLabelText('Alpha'));

    expect(await screen.findByText(/couldn't save/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Alpha')).toBeChecked();
  });
});
