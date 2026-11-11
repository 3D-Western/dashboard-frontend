// The pacing of the loading view (P-200). The pipeline's real progress arrives in bursts; the
// student reads it at a calmer speed. Nothing here invents progress: every popup is a step that
// really finished or something the checks really found, only the moment it is shown is spread out.

import { shownSteps, type Dims } from '@/lib/preparing-steps';
import { findingCards } from '@/lib/preparing-cards';
import type { HandledNote } from '@/lib/story-cards';
import type { StepProgress } from '@/types/pipeline';

/** At most this many popups on the view at once. */
export const MAX_POPUPS = 2;
/** Least time between two popups, and after one that is a finding or a fixed note (so it can be read). */
export const POPUP_GAP_MS = 3000;
export const POPUP_GAP_AFTER_FINDING_MS = 5500;
/** How long a popup stays. */
export const POPUP_STAY_MS = 7500;
/** Least time between two learning cards. */
export const LEARN_GAP_MS = 9000;
/** Once the analysis is really done, the show waits at most this long for the rest of the popups. */
export const MAX_LAG_AFTER_READY_MS = 14_000;
/** The bar climbs at most this fast (share of the whole per second), so it is never a jump. */
export const MAX_CLIMB_PER_S = 0.07;

export interface LoadingEvent {
  id: string;
  kind: 'step' | 'finding' | 'fixed';
  /** Small line above the text. */
  label: string;
  text: string;
  /** Findings are numbered in the order they were found. */
  n?: number;
  /** The lesson code a finding or a fixed note is about. */
  code?: string;
  /** What the lesson card is called, to tell two notes of one code apart. */
  title?: string;
}

const fmt = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ''));

/** Everything the pipeline has reported that is worth a popup, in the order it happened. */
export function collectEvents(
  steps: StepProgress[],
  dims: Dims | null,
  handled: readonly HandledNote[] = [],
): LoadingEvent[] {
  const events: LoadingEvent[] = [];
  if (dims && dims.every((d) => Number.isFinite(d) && d > 0)) {
    events.push({
      id: 'step:dims',
      kind: 'step',
      label: 'Your file',
      text: `It measures ${fmt(dims[0])} x ${fmt(dims[1])} x ${fmt(dims[2])} mm.`,
    });
  }
  // Steps and findings keep their arrival order: walk the steps once.
  const plain = new Map(shownSteps(steps).map((step) => [step.step, step]));
  const finding = new Map(findingCards(steps).map((card) => [card.id, card]));
  const seen = new Set<string>();
  let n = 0;
  for (const step of steps) {
    if (step.state === 'started') continue;
    const shown = plain.get(step.step);
    if (shown && !seen.has(`step:${step.step}`)) {
      seen.add(`step:${step.step}`);
      events.push({
        id: `step:${step.step}`,
        kind: 'step',
        label: shown.title,
        text: shown.teaching,
      });
    }
    const code = step.lesson?.code;
    const card = code ? finding.get(`finding:${code}`) : undefined;
    if (card && !seen.has(card.id)) {
      seen.add(card.id);
      n += 1;
      events.push({
        id: card.id,
        kind: 'finding',
        label: 'Found on your part',
        text: card.title,
        n,
        code,
        title: card.title,
      });
    }
  }
  // What the plan says was found and fixed (P-202), after the real steps. A note a step lesson already
  // showed (same code and title) is not repeated.
  const shownBefore = new Set(
    events.filter((e) => e.kind === 'finding').map((e) => `${e.code}|${e.title}`),
  );
  for (const note of handled) {
    if (shownBefore.has(`${note.code}|${note.title}`)) continue;
    events.push({
      id: note.id,
      kind: 'fixed',
      label: 'Found and fixed',
      text: note.text,
      code: note.code,
      title: note.title,
    });
  }
  return events;
}

export interface ShownEvent {
  event: LoadingEvent;
  at: number;
}

/** The next event that may be shown now, or null (too soon, or nothing waiting). */
export function nextToShow(
  events: LoadingEvent[],
  shown: ShownEvent[],
  now: number,
  force = false,
): LoadingEvent | null {
  const done = new Set(shown.map((s) => s.event.id));
  const next = events.find((event) => !done.has(event.id));
  if (!next) return null;
  const last = shown[shown.length - 1];
  if (!last || force) return next;
  const gap = last.event.kind !== 'step' ? POPUP_GAP_AFTER_FINDING_MS : POPUP_GAP_MS;
  return now - last.at >= gap ? next : null;
}

/** The popups on the view: newest first, at most two, each for about 7.5 s. */
export function visiblePopups(shown: ShownEvent[], now: number): ShownEvent[] {
  return shown
    .filter((s) => now - s.at < POPUP_STAY_MS)
    .slice(-MAX_POPUPS)
    .reverse();
}

const STAGES: ReadonlyArray<readonly [number, string]> = [
  [0, 'Opening your file'],
  [0.12, 'Reading the shape'],
  [0.32, 'Checking how it sits on the plate'],
  [0.55, 'Looking for overhangs'],
  [0.78, 'Checking the details'],
  [0.95, 'Finishing up'],
];

export function stageLabel(progress: number): string {
  let label = STAGES[0][1];
  for (const [from, text] of STAGES) if (progress >= from) label = text;
  return label;
}

/**
 * The bar and the scan follow the real progress but never faster than MAX_CLIMB_PER_S, and never
 * past what the shown popups have caught up with (`ceiling`).
 */
export function easeProgress(display: number, target: number, ceiling: number, dtMs: number) {
  const goal = Math.min(target, ceiling);
  if (goal <= display) return display;
  const step = Math.min(
    MAX_CLIMB_PER_S * (dtMs / 1000),
    (goal - display) * Math.min(1, dtMs / 600) + 0.0005,
  );
  return Math.min(goal, display + step);
}
