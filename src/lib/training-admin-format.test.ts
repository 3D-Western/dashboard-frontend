import { describe, it, expect } from 'vitest';
import {
  createAdminQuestion,
  createAdminStep,
  createTopic,
  createTrainingSummary,
} from '@test/utils/trainingAdminFactories';
import {
  checklistKey,
  clock,
  describeEffects,
  eligibleCount,
  formatBytes,
  impactOption,
  promptPreview,
  slugify,
  trainingStatusLabels,
} from './training-admin-format';

describe('slugify', () => {
  it('makes a URL-safe slug', () => {
    expect(slugify('  Laser Cutter (Epilog) ')).toBe('laser-cutter-epilog');
    expect(slugify('Café Étude')).toBe('cafe-etude');
    expect(slugify('---')).toBe('');
  });
});

describe('checklistKey', () => {
  it('derives a key and avoids the ones taken', () => {
    expect(checklistKey('Shows the E-stop', new Set())).toBe('shows_the_e_stop');
    expect(checklistKey('Shows the E-stop', new Set(['shows_the_e_stop']))).toBe(
      'shows_the_e_stop_2',
    );
    expect(checklistKey('', new Set())).toBe('item');
  });
});

describe('describeEffects', () => {
  const when = () => 'Nov 19';
  it('says what an add-on did', () => {
    expect(
      describeEffects('ADDON', { addonRequired: 3, lapsed: 0, addonDueAt: '2026-11-19' }, when),
    ).toBe('3 certified members now need to finish the add-on by Nov 19.');
    expect(describeEffects('ADDON', { addonRequired: 1, lapsed: 0, addonDueAt: null }, when)).toBe(
      '1 certified member now needs to finish the add-on.',
    );
    expect(
      describeEffects('ADDON', { addonRequired: 0, lapsed: 0, addonDueAt: null }, when),
    ).toMatch(/No one was certified/);
  });

  it('says what a full retake did', () => {
    expect(
      describeEffects('FULL_RETAKE', { addonRequired: 0, lapsed: 2, addonDueAt: null }, when),
    ).toBe('2 members must now retake the whole training.');
    expect(
      describeEffects('FULL_RETAKE', { addonRequired: 0, lapsed: 0, addonDueAt: null }, when),
    ).toMatch(/No one was certified/);
  });

  it('says a minor change affected no one', () => {
    expect(
      describeEffects('MINOR', { addonRequired: 0, lapsed: 0, addonDueAt: null }, when),
    ).toMatch(/Nobody/);
    expect(impactOption('FULL_RETAKE').label).toBe('Full retake');
  });
});

describe('trainingStatusLabels', () => {
  it('lists published, draft and archived states', () => {
    expect(trainingStatusLabels(createTrainingSummary())).toEqual(['Nothing published']);
    expect(
      trainingStatusLabels(
        createTrainingSummary({ currentVersionNo: 3, draftVersionId: 9, archived: true }),
      ),
    ).toEqual(['Published v3', 'Draft in progress', 'Archived']);
  });
});

describe('eligibleCount', () => {
  it('leaves out retired questions and those asked inside the material', () => {
    const topic = createTopic({ id: 7 });
    const q = (id: number, versionId: number, extra = {}) =>
      createAdminQuestion({
        id,
        topicId: 7,
        latest: { ...createAdminQuestion().latest, id: versionId },
        ...extra,
      });
    const questions = [q(1, 101), q(2, 102), q(3, 103), q(4, 104, { active: false })];
    const steps = [
      createAdminStep({ gateQuestionVersionId: 101 }),
      createAdminStep({
        id: 12,
        type: 'VIDEO',
        settings: { checkpoints: [{ atSeconds: 5, questionVersionId: 102 }] },
      }),
    ];
    expect(eligibleCount(topic, questions, steps)).toBe(1);
    expect(eligibleCount(topic, questions, [])).toBe(3);
  });
});

describe('small formatters', () => {
  it('shortens a prompt to one line', () => {
    expect(promptPreview('## Heading\n\nSome **bold** text')).toBe('Heading Some bold text');
    expect(promptPreview('x'.repeat(100), 10)).toBe('xxxxxxxxx…');
  });

  it('formats clock and bytes', () => {
    expect(clock(95)).toBe('1:35');
    expect(clock(-1)).toBe('0:00');
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.00 GB');
  });
});
