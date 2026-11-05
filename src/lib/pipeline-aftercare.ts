// The logic of "after the print" that needs no DOM: the quality reasons, the follow-up answers, and
// what this browser remembers. Student pages only. There is no "I've collected it" step and no
// sequence of questions (P-136, P-137): one card holds the one-tap rating, the optional quality
// step after a thumbs-down and at most two follow-up questions, all answerable in any order or not
// at all.

import type { FollowupAnswer, FollowupQuestion, QualityReason } from '@/types/pipeline';

// -- The quality step -------------------------------------------------------------------------

/** The reason chips of "report print quality" (the pipeline's `QualityReason` values, in student words). */
export const QUALITY_REASONS: { value: QualityReason; label: string }[] = [
  { value: 'warping', label: 'Warped or curled' },
  { value: 'stringing', label: 'Stringy or wispy' },
  { value: 'rough_layers', label: 'Rough layers' },
  { value: 'rough_surface', label: 'Rough surface' },
  { value: 'wrong_size', label: 'Wrong size' },
  { value: 'weak', label: 'Weak or brittle' },
  { value: 'support_marks', label: 'Support marks' },
  { value: 'detail_lost', label: 'Detail lost' },
  { value: 'broke_on_removal', label: 'Broke when removed' },
  { value: 'other', label: 'Something else' },
];

export const QUALITY_TEXT_MAX = 1000;

export const FOLLOWUP_ANSWERS: { value: FollowupAnswer; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Not sure' },
];

/** At most this many follow-up questions are shown, together with the rating and never as a sequence. */
export const MAX_INLINE_FOLLOWUPS = 2;

// -- What this browser remembers --------------------------------------------------------------

const RATED_PREFIX = '3dw:rated:';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the worst case is being offered the rating once more.
  }
}

/** Remembers a rating given here, in case the backend's own "rated" flag is missing or late. */
export const rememberRated = (jobId: string) => write(RATED_PREFIX + jobId, '1');
export const wasRated = (jobId: string) => read(RATED_PREFIX + jobId) !== null;

/** The questions to show now: the first unanswered ones, at most MAX_INLINE_FOLLOWUPS, in the pipeline's order. */
export function inlineFollowups(
  questions: readonly FollowupQuestion[] | undefined,
  handled: readonly number[],
): FollowupQuestion[] {
  return (questions ?? []).filter((q) => !handled.includes(q.questionId)).slice(0, MAX_INLINE_FOLLOWUPS);
}
