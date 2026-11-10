// What the review screen steps through: each marker on the part with its lesson and the choice it
// needs, the lessons that have no region on the part, and choices that belong to no lesson.

import type { PartHighlight } from '@/lib/part-viewer';
import type { Choice, LessonCard } from '@/types/pipeline';

export interface LessonEntry {
  /** The lesson card's `code` (also the marker's), or `choice:<id>` for a choice with no lesson. */
  key: string;
  card?: LessonCard;
  /** Set when the 3D view drew this entry's region. */
  highlight?: PartHighlight;
  /** The marker's number on the part, when it has one. */
  number: number | null;
  /** The choices this lesson needs the student to make. */
  choices: Choice[];
  title: string;
}

export interface ReviewEntries {
  /** Markers first (in marker order), then anything else that needs the student. */
  steps: LessonEntry[];
  /** Lessons with no region on the part: the "More about your part" chips. */
  more: LessonEntry[];
}

/**
 * With the 3D view up, the markers it drew are the steps, and cards without a region go to
 * `more` (unless they hold a choice). Without it (no WebGL, no model, still loading) every card
 * is a step in the panel, consequential ones first, so nothing is lost.
 */
export function buildEntries({
  cards,
  choices,
  drawn,
  viewerReady,
}: {
  cards: LessonCard[];
  choices: Choice[];
  drawn: PartHighlight[];
  viewerReady: boolean;
}): ReviewEntries {
  const byCode = new Map(cards.map((card) => [card.code, card]));
  const choicesOf = new Map<string, Choice[]>();
  const orphans: Choice[] = [];
  for (const choice of choices) {
    const owner = (choice.findingCodes ?? []).find((code) => byCode.has(code));
    if (owner === undefined) orphans.push(choice);
    else choicesOf.set(owner, [...(choicesOf.get(owner) ?? []), choice]);
  }

  const entryOf = (card: LessonCard, highlight?: PartHighlight, number: number | null = null) => ({
    key: card.code,
    card,
    highlight,
    number,
    choices: choicesOf.get(card.code) ?? [],
    title: card.title,
  });

  const steps: LessonEntry[] = [];
  const more: LessonEntry[] = [];
  if (viewerReady) {
    const marked = new Set<string>();
    drawn.forEach((highlight, index) => {
      const card = byCode.get(highlight.code);
      marked.add(highlight.code);
      steps.push(
        card
          ? entryOf(card, highlight, index + 1)
          : {
              key: highlight.code,
              highlight,
              number: index + 1,
              choices: [],
              title: highlight.label,
            },
      );
    });
    for (const card of cards) {
      if (marked.has(card.code)) continue;
      const entry = entryOf(card);
      (entry.choices.length > 0 ? steps : more).push(entry);
    }
  } else {
    const ordered = [
      ...cards.filter((c) => c.consequential),
      ...cards.filter((c) => !c.consequential),
    ];
    for (const card of ordered) steps.push(entryOf(card));
  }

  for (const choice of orphans) {
    steps.push({
      key: `choice:${choice.choiceId}`,
      number: null,
      choices: [choice],
      title: choice.question,
    });
  }
  return { steps, more };
}

/** The entry the panel shows: the focused one, else the first that needs the student, else the first. */
export function currentEntry(entries: ReviewEntries, code: string | null): LessonEntry | undefined {
  const all = [...entries.steps, ...entries.more];
  return (
    all.find((entry) => entry.key === code) ??
    entries.steps.find((entry) => entry.choices.length > 0) ??
    entries.steps[0]
  );
}
