import { describe, expect, it } from 'vitest';
import { createMockLessonCard } from '@test/utils/pipelineFactories';
import type { Choice } from '@/types/pipeline';
import type { PartHighlight } from './part-viewer';
import { buildEntries, currentEntry } from './review-lessons';

const card = (code: string, over = {}) =>
  createMockLessonCard({ code, title: `Title ${code}`, ...over });
const marker = (code: string): PartHighlight => ({
  code,
  severity: 'adjusted',
  label: `Label ${code}`,
  faces: null,
  bboxMm: [0, 0, 0, 1, 1, 1],
});
const choice = (choiceId: string, findingCodes?: string[]): Choice => ({
  choiceId,
  question: `Q ${choiceId}`,
  options: [{ optionId: 'a', label: 'A', explanation: 'x' }],
  findingCodes,
});

describe('buildEntries', () => {
  it('with the 3D view up: markers in marker order, lessons without a region as "more"', () => {
    const cards = [card('a'), card('b'), card('plain', { region: null, consequential: false })];
    const { steps, more } = buildEntries({
      cards,
      choices: [],
      drawn: [marker('b'), marker('a')],
      viewerReady: true,
    });
    expect(steps.map((e) => [e.key, e.number])).toEqual([
      ['b', 1],
      ['a', 2],
    ]);
    expect(more.map((e) => e.key)).toEqual(['plain']);
  });

  it('attaches a choice to the lesson named in its findingCodes, and keeps unattached ones as steps', () => {
    const { steps } = buildEntries({
      cards: [card('a')],
      choices: [choice('c1', ['a']), choice('c2')],
      drawn: [marker('a')],
      viewerReady: true,
    });
    expect(steps[0].choices.map((c) => c.choiceId)).toEqual(['c1']);
    expect(steps[1]).toMatchObject({ key: 'choice:c2', number: null });
  });

  it('a lesson with a choice but no region is a step, not a chip', () => {
    const { steps, more } = buildEntries({
      cards: [card('x', { region: null })],
      choices: [choice('c1', ['x'])],
      drawn: [],
      viewerReady: true,
    });
    expect(steps.map((e) => e.key)).toEqual(['x']);
    expect(more).toEqual([]);
  });

  it('without the 3D view every lesson is a step, consequential first', () => {
    const { steps, more } = buildEntries({
      cards: [card('quiet', { consequential: false }), card('loud')],
      choices: [],
      drawn: [],
      viewerReady: false,
    });
    expect(steps.map((e) => e.key)).toEqual(['loud', 'quiet']);
    expect(more).toEqual([]);
  });
});

describe('currentEntry', () => {
  it('prefers the focused one, then the first that needs the student', () => {
    const entries = buildEntries({
      cards: [card('a'), card('b')],
      choices: [choice('c', ['b'])],
      drawn: [],
      viewerReady: false,
    });
    expect(currentEntry(entries, 'a')?.key).toBe('a');
    expect(currentEntry(entries, null)?.key).toBe('b');
    expect(currentEntry(entries, 'gone')?.key).toBe('b');
  });
});
