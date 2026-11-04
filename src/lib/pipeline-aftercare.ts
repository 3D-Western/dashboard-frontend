// The logic of "after the print" that needs no DOM: the quality reasons, what this browser
// remembers so nobody is asked twice (P-92 #13: never annoying), and where the after-collection
// flow is. Student pages only.

import type {
  FollowupAnswer,
  FollowupQuestion,
  QualityReason,
  Rating,
  StudentStatus,
} from '@/types/pipeline';

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

// -- What this browser remembers --------------------------------------------------------------

const RATED_PREFIX = '3dw:rated:';
const SKIPPED_PREFIX = '3dw:rating-skipped:';
/** A skipped rating is not asked again for a day. */
export const SKIP_MEMORY_MS = 24 * 60 * 60 * 1000;

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
    // Private mode or blocked storage: the worst case is being asked once more.
  }
}

/** Remembers a rating given here, in case the backend's own "rated" flag is missing or late. */
export const rememberRated = (jobId: string) => write(RATED_PREFIX + jobId, '1');
export const wasRated = (jobId: string) => read(RATED_PREFIX + jobId) !== null;

/** "Not now" on a rating prompt. */
export const rememberRatingSkipped = (jobId: string, now = Date.now()) =>
  write(SKIPPED_PREFIX + jobId, String(now));
export function wasRatingSkipped(jobId: string, now = Date.now()): boolean {
  const at = Number(read(SKIPPED_PREFIX + jobId));
  return Number.isFinite(at) && at > 0 && now - at < SKIP_MEMORY_MS;
}

/** Follow-up questions the student skipped: asking again on every visit would be nagging. */
const FOLLOWUP_SKIPPED_PREFIX = '3dw:followups-skipped:';

export function skippedFollowups(jobId: string): number[] {
  try {
    const parsed: unknown = JSON.parse(read(FOLLOWUP_SKIPPED_PREFIX + jobId) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

export function rememberFollowupSkipped(jobId: string, questionId: number) {
  const known = skippedFollowups(jobId);
  if (!known.includes(questionId)) {
    write(FOLLOWUP_SKIPPED_PREFIX + jobId, JSON.stringify([...known, questionId]));
  }
}

// -- After collection -------------------------------------------------------------------------

export type AftercareStep = 'rate' | 'quality' | 'followups' | 'done';

/**
 * Where the after-collection flow is: rate (unless already rated), the optional quality step
 * after a thumbs-down, the follow-up questions one at a time, then done.
 */
export function aftercareStep(input: {
  rated: boolean;
  rating: Rating | null;
  qualityHandled: boolean;
  unanswered: number;
}): AftercareStep {
  if (!input.rated) return 'rate';
  if (input.rating === 'down' && !input.qualityHandled) return 'quality';
  return input.unanswered > 0 ? 'followups' : 'done';
}

/** The question to ask now: the first one not answered or skipped yet. */
export function nextQuestion(
  questions: readonly FollowupQuestion[] | undefined,
  handled: readonly number[],
): FollowupQuestion | null {
  return questions?.find((q) => !handled.includes(q.questionId)) ?? null;
}

/** Statuses after which the student has the print in hand and can rate it. */
export const isCollectedStatus = (status: StudentStatus | null | undefined) =>
  status === 'collected';
