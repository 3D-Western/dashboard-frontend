import { describe, it, expect } from 'vitest';
import { createAdminStep } from '@test/utils/trainingAdminFactories';
import {
  describeStep,
  formFromStep,
  parseOutcomes,
  toStepBody,
  validateStep,
  type StepFormValues,
} from './training-step-form';

const videoForm = (overrides: Partial<StepFormValues> = {}): StepFormValues => ({
  ...formFromStep(null),
  title: 'Intro',
  duration: '120',
  ...overrides,
});

describe('validateStep', () => {
  it('needs a title', () => {
    expect(validateStep('READING', { ...formFromStep(null), title: ' ' })?.title).toBeTruthy();
    expect(validateStep('READING', { ...formFromStep(null), title: 'Hi' })).toBeNull();
  });

  it('accepts a video that has no file or length yet', () => {
    expect(validateStep('VIDEO', videoForm({ duration: '' }))).toBeNull();
  });

  it('keeps the video length to 1..600 whole seconds', () => {
    expect(validateStep('VIDEO', videoForm({ duration: '601' }))?.duration).toMatch(/10 minutes/);
    expect(validateStep('VIDEO', videoForm({ duration: '0' }))?.duration).toBeTruthy();
    expect(validateStep('VIDEO', videoForm({ duration: '4.5' }))?.duration).toBeTruthy();
  });

  it('keeps the minimum watched share to 1..100', () => {
    expect(validateStep('VIDEO', videoForm({ minWatch: '0' }))?.minWatch).toBeTruthy();
    expect(validateStep('VIDEO', videoForm({ minWatch: '101' }))?.minWatch).toBeTruthy();
  });

  it('checks outcome names', () => {
    expect(validateStep('VIDEO', videoForm({ outcomes: '1bad' }))?.outcomes).toBeTruthy();
    expect(validateStep('VIDEO', videoForm({ outcomes: 'watched, watched' }))?.outcomes).toMatch(
      /once/,
    );
    expect(validateStep('VIDEO', videoForm({ outcomes: 'watched, seen:all' }))).toBeNull();
  });

  it('needs the video length before checkpoints can be placed', () => {
    const errors = validateStep(
      'VIDEO',
      videoForm({ duration: '', checkpoints: [{ uid: 1, at: '10', questionVersionId: 5 }] }),
    );
    expect(errors?.checkpoints).toMatch(/length/);
  });

  it('checks each checkpoint: inside the video, unique second, unique question, chosen', () => {
    const errors = validateStep(
      'VIDEO',
      videoForm({
        checkpoints: [
          { uid: 1, at: '30', questionVersionId: 5 },
          { uid: 2, at: '30', questionVersionId: 5 },
          { uid: 3, at: '500', questionVersionId: null },
          { uid: 4, at: 'x', questionVersionId: 6 },
        ],
      }),
    );
    expect(errors?.rows[1]).toBeUndefined();
    expect(errors?.rows[2]).toEqual({
      at: expect.stringMatching(/same second/),
      question: expect.stringMatching(/once/),
    });
    expect(errors?.rows[3]).toEqual({
      at: expect.stringMatching(/inside the video/),
      question: expect.stringMatching(/Choose/),
    });
    expect(errors?.rows[4]?.at).toBeTruthy();
  });
});

describe('toStepBody', () => {
  it('sends a video with sorted checkpoints and outcomes, keeping unknown settings', () => {
    const existing = createAdminStep({
      type: 'VIDEO',
      settings: { future: { a: 1 }, outcomes: ['watched'] },
    });
    const body = toStepBody(
      'VIDEO',
      videoForm({
        assetKey: 'videos/a.mp4',
        outcomes: 'watched, seen',
        checkpoints: [
          { uid: 1, at: '90', questionVersionId: 7 },
          { uid: 2, at: '20', questionVersionId: 8 },
        ],
      }),
      existing,
    );

    expect(body).toMatchObject({
      type: 'VIDEO',
      videoAssetKey: 'videos/a.mp4',
      videoDurationSeconds: 120,
      minWatchPercent: 90,
      settings: {
        future: { a: 1 },
        outcomes: ['watched', 'seen'],
        checkpoints: [
          { atSeconds: 20, questionVersionId: 8 },
          { atSeconds: 90, questionVersionId: 7 },
        ],
      },
    });
  });

  it('sends the gate question of a reading and leaves video fields out', () => {
    const body = toStepBody(
      'READING',
      { ...formFromStep(null), title: 'Read', body: 'Text', gate: 12 },
      null,
    );
    expect(body).toEqual({
      type: 'READING',
      title: 'Read',
      addonScope: false,
      bodyMarkdown: 'Text',
      gateQuestionVersionId: 12,
    });
  });

  it('sends an attestation and a quiz plainly', () => {
    expect(
      toStepBody('ATTESTATION', { ...formFromStep(null), title: 'Agree', body: 'I agree' }, null),
    ).toMatchObject({ type: 'ATTESTATION', bodyMarkdown: 'I agree' });
    expect(toStepBody('QUIZ', { ...formFromStep(null), title: 'Quiz' }, null)).toEqual({
      type: 'QUIZ',
      title: 'Quiz',
      addonScope: false,
    });
  });
});

describe('formFromStep and describeStep', () => {
  it('starts a new video with the "watched" outcome', () => {
    expect(formFromStep(null).outcomes).toBe('watched');
    expect(parseOutcomes(' a, b  c ')).toEqual(['a', 'b', 'c']);
  });

  it('describes each kind of step in a line', () => {
    expect(describeStep(createAdminStep({ type: 'VIDEO' }))).toMatch(/No video uploaded yet/);
    expect(
      describeStep(
        createAdminStep({
          type: 'VIDEO',
          videoAssetKey: 'k',
          videoDurationSeconds: 90,
          settings: { checkpoints: [{ atSeconds: 5, questionVersionId: 1 }] },
        }),
      ),
    ).toBe('Video uploaded · 90 s · 1 question during it');
    expect(describeStep(createAdminStep({ bodyMarkdown: 'one two three' }))).toBe('3 words');
    expect(describeStep(createAdminStep({ type: 'QUIZ', blueprint: [] }))).toMatch(/No topics/);
    expect(
      describeStep(
        createAdminStep({
          type: 'QUIZ',
          blueprint: [{ topicId: 1, topicSlug: 's', drawCount: 4, poolSize: 4 }],
        }),
      ),
    ).toBe('1 topic · 4 questions');
    expect(describeStep(createAdminStep({ type: 'ATTESTATION', bodyMarkdown: ' ' }))).toMatch(
      /No statement/,
    );
  });
});
