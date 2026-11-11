import { describe, it, expect } from 'vitest';
import { allChosen, buildStory, firstSentence, splitPlan, summaryLine } from './story-cards';
import { createMockLessonCard } from '@test/utils/pipelineFactories';

const choice = {
  choiceId: 'brim',
  question: 'Add a brim?',
  findingCodes: ['contact.small'],
  options: [
    { optionId: 'yes', label: 'Yes, add a brim', explanation: 'Recommended.', recommended: true },
    { optionId: 'no', label: 'No brim', explanation: 'Less to snap off.' },
  ],
};

describe('the story', () => {
  it('keeps only what the student should know or decide, choices first', () => {
    const story = buildStory({
      lessonCards: [
        createMockLessonCard({ code: 'hinge', title: 'A hinge', severity: 'choice' }),
        createMockLessonCard({ code: 'tab', title: 'Propped up', severity: 'adjusted' }),
        createMockLessonCard({
          code: 'note',
          title: 'Fine strings',
          severity: 'info',
          consequential: false,
        }),
        createMockLessonCard({
          code: 'contact.small',
          title: 'Small footprint',
          severity: 'choice',
        }),
      ],
      choices: [choice],
    });

    // handled ('tab') and not consequential ('note') are not story cards
    expect(story.map((c) => [c.tag, c.key])).toEqual([
      ['choice', 'contact.small'],
      ['worth', 'hinge'],
    ]);
    expect(story[0].hint).toBe('Pick one to continue');
    expect(story[1].hint).toBe('Nothing to do');
  });

  it('moves small handled things to the loading as found-and-fixed notes, one per pack', () => {
    const { story, handled, noted } = splitPlan({
      lessonCards: [
        createMockLessonCard({
          code: 'pack.applied',
          title: 'Small contact area or tall and slender: print settings adjusted',
          body: 'Your part is tall on a small base, so we added a 5 mm brim to help it stay put. Your part prints the same shape.',
          severity: 'adjusted',
        }),
        createMockLessonCard({
          code: 'pack.applied',
          title: 'Large flat or long parts: print settings adjusted',
          body: 'Your part is wide and flat, so we slowed the fan to keep the corners down.',
          severity: 'adjusted',
        }),
        createMockLessonCard({
          code: 'soundness.hairline_cracks',
          title: 'Hairline cracks in the file',
          body: 'Your file has a few hairline cracks in its surface. The slicer closes them.',
          severity: 'info',
          consequential: false,
        }),
        createMockLessonCard({
          code: 'soundness.degenerate_faces',
          title: 'Empty triangles in the file',
          body: 'Your file contains triangles with no area at all.',
          severity: 'info',
          consequential: false,
        }),
        createMockLessonCard({
          code: 'overhang.curl_risk',
          title: 'Steep overhangs near thin parts may curl',
          body: 'Thin overhangs can curl.',
          severity: 'info',
          consequential: false,
        }),
      ],
      choices: [],
    });
    expect(story).toEqual([]);
    // two cards sharing a code (two packs) stay two notes with their own wording
    expect(handled.map((n) => n.title)).toEqual([
      'Small contact area or tall and slender: print settings adjusted',
      'Large flat or long parts: print settings adjusted',
      'Hairline cracks in the file',
      'Empty triangles in the file',
    ]);
    expect(handled[0].text).toBe(
      'Your part is tall on a small base, so we added a 5 mm brim to help it stay put.',
    );
    expect(handled[2].text).toMatch(/^Hairline cracks in the file: fixed for you\./);
    expect(noted.map((n) => n.code)).toEqual(['overhang.curl_risk']);
  });

  it('never shows two cards alike: a repeated title folds into the first, keeping its choice', () => {
    const story = buildStory({
      lessonCards: [
        createMockLessonCard({
          code: 'a.sits',
          title: 'How your part sits on the plate',
          severity: 'choice',
        }),
        createMockLessonCard({
          code: 'b.sits',
          title: 'How your part sits on the plate',
          severity: 'choice',
        }),
      ],
      choices: [{ ...choice, findingCodes: ['b.sits'] }],
    });
    expect(story).toHaveLength(1);
    expect(story[0]).toMatchObject({ key: 'a.sits', codes: ['a.sits', 'b.sits'], tag: 'choice' });
    expect(story[0].choices).toHaveLength(1);
  });

  it('never shows what a staff hold marked', () => {
    const story = buildStory({
      lessonCards: [
        createMockLessonCard({ code: 'h', title: 'Held', severity: 'hold' }),
        createMockLessonCard({ code: 'a', title: 'Fine', severity: 'info' }),
      ],
      choices: [],
    });
    expect(story.map((c) => c.key)).toEqual(['a']);
  });

  it('gives a choice that belongs to no lesson a card of its own', () => {
    const story = buildStory({ lessonCards: [], choices: [{ ...choice, findingCodes: [] }] });
    expect(story).toHaveLength(1);
    expect(story[0]).toMatchObject({ tag: 'choice', title: 'Add a brim?' });
  });

  it('knows when every choice has a pick, and words the summary row with it', () => {
    const [card] = buildStory({
      lessonCards: [createMockLessonCard({ code: 'contact.small', severity: 'choice' })],
      choices: [choice],
    });
    expect(allChosen([card], {})).toBe(false);
    expect(summaryLine(card, {})).toBe('Not chosen yet');
    expect(allChosen([card], { brim: 'no' })).toBe(true);
    expect(summaryLine(card, { brim: 'no' })).toBe('No brim');
  });

  it('gives the first sentence of a lesson for the summary', () => {
    expect(firstSentence('The tab hangs 4 mm over nothing. We tilted the part.')).toBe(
      'The tab hangs 4 mm over nothing.',
    );
    expect(firstSentence('No full stop here')).toBe('No full stop here');
  });
});
