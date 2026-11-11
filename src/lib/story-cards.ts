// The story the student steps through before the summary (P-200): one card per thing on the plan,
// tagged "Your choice" (they decide), "Handled for you" (we fixed it) or "Worth knowing". Built
// only from the plan's real lesson cards and choices; nothing is added.

import { withoutHolds } from '@/lib/part-viewer';
import type { Choice, LessonCard, Plan } from '@/types/pipeline';

export type StoryTag = 'choice' | 'handled' | 'worth';

export const TAG_LABEL: Record<StoryTag, string> = {
  choice: 'Your choice',
  handled: 'Handled for you',
  worth: 'Worth knowing',
};

export interface StoryCard {
  /** The lesson card's `code` (also its marker's), or `choice:<id>` for a choice with no lesson. */
  key: string;
  tag: StoryTag;
  hint: string;
  title: string;
  body: string;
  /** The choices the student makes on this card. */
  choices: Choice[];
  card?: LessonCard;
}

const ORDER: Record<StoryTag, number> = { choice: 0, handled: 1, worth: 2 };

const hintFor = (tag: StoryTag) => (tag === 'choice' ? 'Pick one to continue' : 'Nothing to do');

export function buildStory(plan: Pick<Plan, 'lessonCards' | 'choices'>): StoryCard[] {
  const cards = withoutHolds(plan.lessonCards ?? []);
  const byCode = new Map(cards.map((card) => [card.code, card]));
  const choicesOf = new Map<string, Choice[]>();
  const orphans: Choice[] = [];
  for (const choice of plan.choices ?? []) {
    const owner = (choice.findingCodes ?? []).find((code) => byCode.has(code));
    if (owner === undefined) orphans.push(choice);
    else choicesOf.set(owner, [...(choicesOf.get(owner) ?? []), choice]);
  }

  const story: StoryCard[] = cards.map((card) => {
    const choices = choicesOf.get(card.code) ?? [];
    const tag: StoryTag =
      choices.length > 0 ? 'choice' : card.severity === 'adjusted' ? 'handled' : 'worth';
    return {
      key: card.code,
      tag,
      hint: hintFor(tag),
      title: card.title,
      body: card.body,
      choices,
      card,
    };
  });
  for (const choice of orphans) {
    story.push({
      key: `choice:${choice.choiceId}`,
      tag: 'choice',
      hint: hintFor('choice'),
      title: choice.question,
      body: '',
      choices: [choice],
    });
  }
  // Array.sort is stable: the pipeline's own order holds inside each tag.
  return story.sort((a, b) => ORDER[a.tag] - ORDER[b.tag]);
}

/** Every choice on the story has a pick. */
export function allChosen(story: StoryCard[], picked: Record<string, string>): boolean {
  return story.every((card) => card.choices.every((choice) => picked[choice.choiceId]));
}

/** The first sentence, for the summary's one-line description. */
export function firstSentence(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const match = flat.match(/^.*?[.!?](?=\s|$)/);
  return match ? match[0] : flat;
}

/** What a summary row says under the title: the pick for a choice, else the first sentence. */
export function summaryLine(card: StoryCard, picked: Record<string, string>): string {
  if (card.choices.length > 0) {
    return card.choices
      .map((choice) => {
        const option = choice.options.find((o) => o.optionId === picked[choice.choiceId]);
        return option ? option.label : 'Not chosen yet';
      })
      .join(' · ');
  }
  return firstSentence(card.body);
}
