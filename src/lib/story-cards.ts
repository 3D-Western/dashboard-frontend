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
  /** Every code that stands for this card: cards that would repeat it (same title) fold into it. */
  codes: string[];
  tag: StoryTag;
  hint: string;
  title: string;
  body: string;
  /** The choices the student makes on this card. */
  choices: Choice[];
  card?: LessonCard;
}

/** A small thing the pipeline dealt with: taught while loading, listed in one line in the summary. */
export interface HandledNote {
  /** `fixed:<code>:<title>`: stable, and different for two cards that share a code (two packs). */
  id: string;
  code: string;
  title: string;
  /** The issue, that it was handled, and why, in one or two sentences. */
  text: string;
}

export interface StoryParts {
  /** What the student reads or decides on, in order. */
  story: StoryCard[];
  /** Found and fixed (geometry repairs, settings packs): the loading teaches them. */
  handled: HandledNote[];
  /** Everything else the analysis noted (not consequential): one line each in the summary. */
  noted: HandledNote[];
}

/** The type colours of the mockup: markers and the focused area glow in them. */
export const TAG_COLOR: Record<StoryTag, string> = {
  choice: '#c25bf0',
  handled: '#3fb950',
  worth: '#58a6ff',
};

const ORDER: Record<StoryTag, number> = { choice: 0, handled: 1, worth: 2 };

const hintFor = (tag: StoryTag) => (tag === 'choice' ? 'Pick one to continue' : 'Nothing to do');

/** Codes whose finding is a repair or a setting the pipeline dealt with by itself, never a decision. */
const SELF_HANDLED = /^(pack\.applied|soundness\.|inside_out\.|bodies\.debris)/;
const NEVER_HANDLED = /\.skipped$/;

/** The first sentence, for the summary's one-line description. */
export function firstSentence(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const match = flat.match(/^.*?[.!?](?=\s|$)/);
  return match ? match[0] : flat;
}

const isPack = (code: string) => code.startsWith('pack.applied');

/** Whether a card with no choice on it was handled by the pipeline (so it is a note, not a story card). */
function isHandled(card: LessonCard): boolean {
  if (NEVER_HANDLED.test(card.code)) return false;
  if (card.severity === 'adjusted') return true;
  return card.severity === 'info' && SELF_HANDLED.test(card.code);
}

function noteOf(card: LessonCard): HandledNote {
  const why = firstSentence(card.body);
  // A pack's body already says the issue, the fix and why ("Your part is tall ..., so we added a brim"), and a title
  // that starts with "We" says what was done ("We added a brim to keep it standing"): neither needs "fixed for you".
  const text = isPack(card.code)
    ? why
    : /^we\s/i.test(card.title)
      ? `${card.title}. ${why}`
      : `${card.title}: fixed for you. ${why}`;
  return { id: `fixed:${card.code}:${card.title}`, code: card.code, title: card.title, text };
}

/**
 * Splits the plan (P-202): the story is the choices and the consequential cards that need the student
 * (each titled by its concern, none twice); small handled things go to the loading as notes; the rest
 * is only listed in the summary.
 */
export function splitPlan(plan: Pick<Plan, 'lessonCards' | 'choices'>): StoryParts {
  const cards = withoutHolds(plan.lessonCards ?? []);
  const byCode = new Map(cards.map((card) => [card.code, card]));
  const choicesOf = new Map<string, Choice[]>();
  const orphans: Choice[] = [];
  for (const choice of plan.choices ?? []) {
    const owner = (choice.findingCodes ?? []).find((code) => byCode.has(code));
    if (owner === undefined) orphans.push(choice);
    else choicesOf.set(owner, [...(choicesOf.get(owner) ?? []), choice]);
  }

  const story: StoryCard[] = [];
  const byTitle = new Map<string, StoryCard>();
  const handled: HandledNote[] = [];
  const noted: HandledNote[] = [];
  const seenNotes = new Set<string>();
  const pushNote = (list: HandledNote[], card: LessonCard) => {
    const note = noteOf(card);
    if (seenNotes.has(note.id)) return;
    seenNotes.add(note.id);
    list.push(note);
  };

  for (const card of cards) {
    const choices = choicesOf.get(card.code) ?? [];
    if (choices.length === 0 && isHandled(card)) {
      pushNote(handled, card);
      continue;
    }
    if (choices.length === 0 && !card.consequential) {
      pushNote(noted, card);
      continue;
    }
    const tag: StoryTag = choices.length > 0 ? 'choice' : 'worth';
    // Two cards with one title would read as a repeat: fold the later into the first.
    const same = byTitle.get(card.title.trim().toLowerCase());
    if (same) {
      same.codes.push(card.code);
      same.choices.push(...choices);
      if (choices.length > 0) {
        same.tag = 'choice';
        same.hint = hintFor('choice');
      }
      continue;
    }
    const entry: StoryCard = {
      key: card.code,
      codes: [card.code],
      tag,
      hint: hintFor(tag),
      title: card.title,
      body: card.body,
      choices: [...choices],
      card,
    };
    byTitle.set(card.title.trim().toLowerCase(), entry);
    story.push(entry);
  }
  for (const choice of orphans) {
    story.push({
      key: `choice:${choice.choiceId}`,
      codes: [],
      tag: 'choice',
      hint: hintFor('choice'),
      title: choice.question,
      body: '',
      choices: [choice],
    });
  }
  // Array.sort is stable: the pipeline's own order holds inside each tag.
  story.sort((a, b) => ORDER[a.tag] - ORDER[b.tag]);
  return { story, handled, noted };
}

export function buildStory(plan: Pick<Plan, 'lessonCards' | 'choices'>): StoryCard[] {
  return splitPlan(plan).story;
}

/** Every choice on the story has a pick. */
export function allChosen(story: StoryCard[], picked: Record<string, string>): boolean {
  return story.every((card) => card.choices.every((choice) => picked[choice.choiceId]));
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
