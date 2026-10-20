import { describe, it, expect } from 'vitest';
import { createAdminQuestion } from '@test/utils/trainingAdminFactories';
import {
  blankOptions,
  emptyForm,
  formFromQuestion,
  optionsForType,
  toQuestionBody,
  trueFalseOptions,
  validateQuestion,
  type QuestionFormValues,
} from './training-question-form';

const filled = (overrides: Partial<QuestionFormValues> = {}): QuestionFormValues => ({
  ...emptyForm('7'),
  prompt: 'Which?',
  options: [
    { uid: 1, label: 'A', correct: true },
    { uid: 2, label: 'B', correct: false },
  ],
  ...overrides,
});

describe('validateQuestion', () => {
  it('accepts a valid single-answer question', () => {
    expect(validateQuestion(filled())).toEqual({});
  });

  it('needs a topic and a prompt', () => {
    const errors = validateQuestion(filled({ topicId: '', prompt: ' ' }));
    expect(errors.topic).toBeTruthy();
    expect(errors.prompt).toBeTruthy();
  });

  it('needs exactly one correct option for single answer', () => {
    const none = filled({ options: filled().options.map((o) => ({ ...o, correct: false })) });
    expect(validateQuestion(none).options).toMatch(/exactly one/);
    const two = filled({ options: filled().options.map((o) => ({ ...o, correct: true })) });
    expect(validateQuestion(two).options).toMatch(/exactly one/);
  });

  it('needs at least one correct option for multiple answers', () => {
    const none = filled({
      type: 'MULTI',
      options: filled().options.map((o) => ({ ...o, correct: false })),
    });
    expect(validateQuestion(none).options).toMatch(/at least one/);
    const both = filled({
      type: 'MULTI',
      options: filled().options.map((o) => ({ ...o, correct: true })),
    });
    expect(validateQuestion(both)).toEqual({});
  });

  it('needs text in every option and 2 to 10 options', () => {
    expect(
      validateQuestion(
        filled({
          options: [
            { uid: 1, label: 'A', correct: true },
            { uid: 2, label: ' ', correct: false },
          ],
        }),
      ).options,
    ).toMatch(/text/);
    expect(
      validateQuestion(filled({ options: [{ uid: 1, label: 'A', correct: true }] })).options,
    ).toMatch(/2 to 10/);
  });

  it('asks a true/false question to pick true or false', () => {
    expect(
      validateQuestion(filled({ type: 'TRUE_FALSE', options: trueFalseOptions(null) })).options,
    ).toMatch(/true or false/);
    expect(validateQuestion(filled({ type: 'TRUE_FALSE', options: trueFalseOptions(1) }))).toEqual(
      {},
    );
  });

  it('checks the review step', () => {
    expect(validateQuestion(filled({ remediation: 'x' })).remediation).toBeTruthy();
    expect(validateQuestion(filled({ remediation: '2' }))).toEqual({});
  });
});

describe('optionsForType', () => {
  it('turns options into True/False, keeping which was correct', () => {
    const options = optionsForType('TRUE_FALSE', filled().options);
    expect(options.map((o) => o.label)).toEqual(['True', 'False']);
    expect(options.map((o) => o.correct)).toEqual([true, false]);
    // Already true/false: unchanged
    expect(optionsForType('TRUE_FALSE', options)).toBe(options);
  });

  it('leaves True/False for fresh blank options', () => {
    const options = optionsForType('SINGLE', trueFalseOptions(0));
    expect(options).toHaveLength(3);
    expect(options.every((o) => o.label === '' && !o.correct)).toBe(true);
  });

  it('keeps only one correct option when going to single answer', () => {
    const multi = [
      { uid: 1, label: 'A', correct: true },
      { uid: 2, label: 'B', correct: true },
      { uid: 3, label: 'C', correct: false },
    ];
    expect(optionsForType('SINGLE', multi).filter((o) => o.correct)).toHaveLength(1);
    expect(optionsForType('MULTI', multi)).toBe(multi);
  });

  it('creates blank options', () => {
    expect(blankOptions()).toHaveLength(2);
  });
});

describe('question body', () => {
  it('keeps option ids and trims text', () => {
    const question = createAdminQuestion();
    const form = formFromQuestion(question);
    expect(form.options.map((o) => o.id)).toEqual([1, 2]);

    const body = toQuestionBody(
      { ...form, prompt: '  Where?  ', remediation: '3', explanation: ' ' },
      7,
    );
    expect(body).toMatchObject({
      topicId: 7,
      promptMarkdown: 'Where?',
      explanationMarkdown: null,
      remediationStepPosition: 3,
      options: [
        { id: 1, labelMarkdown: 'On the front panel', correct: true },
        { id: 2, labelMarkdown: 'Behind the machine', correct: false },
      ],
    });
  });
});
