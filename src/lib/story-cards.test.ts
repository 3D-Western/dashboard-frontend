import { describe, it, expect } from 'vitest';
import { allChosen, buildStory, firstSentence, summaryLine } from './story-cards';
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
  it('orders the cards: your choices, then what was handled, then what is worth knowing', () => {
    const story = buildStory({
      lessonCards: [
        createMockLessonCard({ code: 'hinge', title: 'A hinge', severity: 'info' }),
        createMockLessonCard({ code: 'tab', title: 'Propped up', severity: 'adjusted' }),
        createMockLessonCard({
          code: 'contact.small',
          title: 'Small footprint',
          severity: 'choice',
        }),
      ],
      choices: [choice],
    });

    expect(story.map((c) => [c.tag, c.key])).toEqual([
      ['choice', 'contact.small'],
      ['handled', 'tab'],
      ['worth', 'hinge'],
    ]);
    expect(story[0].hint).toBe('Pick one to continue');
    expect(story[1].hint).toBe('Nothing to do');
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
