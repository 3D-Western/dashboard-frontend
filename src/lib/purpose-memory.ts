import type { Purpose } from '@/types/pipeline';

// The purpose question and its short sub-form (P-200, the signed-off intake). What a student
// answered before is remembered in this browser only (the pipeline's API does not hand a student
// their past inputs back) and offered through the "Recent" pill and each field's list of past
// answers. Nothing is ever filled in for the student.

export interface PurposeField {
  key: string;
  label: string;
  placeholder: string;
  /** Short answers only; a field that is not optional must be filled before Continue. */
  optional?: boolean;
}

export interface PurposeOption {
  value: Purpose;
  label: string;
  /** One line under the label. */
  hint: string;
  /** The first row, in the featured style, with a brief tag (P-199). */
  featured?: boolean;
  tag?: string;
  /** Shown under the choice once it is picked. */
  note?: string;
  /** At most one extra field per purpose (Personal has none). */
  fields: PurposeField[];
  /** The example inside the description box, which changes with the choice. */
  descriptionExample: string;
}

/** The five purposes offered, in the order shown. `other` is kept in the type for old jobs only. */
export const PURPOSES: PurposeOption[] = [
  {
    value: 'venture',
    label: 'Startup / venture',
    hint: 'A company or project you are building',
    featured: true,
    tag: 'No usage limits',
    note: "Venture prints don't count toward your usage limit.",
    fields: [{ key: 'venture_name', label: 'Venture name', placeholder: 'e.g. Hingeworks' }],
    descriptionExample:
      "e.g. A snap-fit hinge for our prototype's enclosure. It has to survive a few hundred open and close cycles.",
  },
  {
    value: 'class',
    label: 'Class',
    hint: 'An assignment or course project',
    fields: [{ key: 'course', label: 'Course code', placeholder: 'e.g. MME 2202' }],
    descriptionExample:
      'e.g. A gear for my mechanisms assignment. It has to mesh with a 20-tooth gear, so the dimensions matter more than looks.',
  },
  {
    value: 'club',
    label: 'Club or student team',
    hint: 'Printing for a club or student team',
    fields: [{ key: 'club_name', label: 'Club or team name', placeholder: 'e.g. Robotics Club' }],
    descriptionExample:
      "e.g. A bracket for our club's rover. What the team needs it for, and by when.",
  },
  {
    value: 'research',
    label: 'Research',
    hint: 'Lab work or a thesis',
    fields: [
      {
        key: 'lab',
        label: 'Lab or supervisor (optional)',
        placeholder: 'e.g. Chen Lab',
        optional: true,
      },
    ],
    descriptionExample:
      'e.g. A fixture to hold samples in our lab rig. Tolerances matter more than looks.',
  },
  {
    value: 'personal',
    label: 'Personal',
    hint: 'Hobby, gift, repair, anything else',
    fields: [],
    descriptionExample:
      'e.g. A phone stand for my desk, a prop for a costume, a gift for a friend. Anything goes.',
  },
];

/** "Tell us about it" is a sentence or two (P-202): at least this many characters before Continue, at most this many. */
export const MIN_DESCRIPTION = 20;
export const MAX_DESCRIPTION = 280;

export const NO_PURPOSE_EXAMPLE =
  'Choose what it is for above, then say in a sentence or two what it is and what it has to do.';

export const optionFor = (purpose: Purpose | null | undefined): PurposeOption | undefined =>
  PURPOSES.find((option) => option.value === purpose);

/** A purpose with its answers, as the "Recent" pill offers it. */
export interface RecentAnswer {
  purpose: Purpose;
  details: Record<string, string>;
}

interface Memory {
  /** Newest first, at most RECENT_LIMIT, each purpose-and-details pair once. */
  recent: RecentAnswer[];
  /** Past answers per field key, newest first. */
  fields: Record<string, string[]>;
}

const STORAGE_KEY = '3dw.printFlow.history.v2';
const LEGACY_KEY = '3dw.printFlow.purpose.v1';
export const RECENT_LIMIT = 3;
const FIELD_LIMIT = 5;

const isPurpose = (value: unknown): value is Purpose =>
  PURPOSES.some((option) => option.value === value);

function readMemory(): Memory {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Memory>;
      return {
        recent: (parsed.recent ?? []).filter((item) => isPurpose(item?.purpose)),
        fields: parsed.fields ?? {},
      };
    }
    // The first release remembered one answer; it becomes the first "recent" one.
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy) as {
        purpose?: unknown;
        details?: Record<string, Record<string, string>>;
      };
      if (isPurpose(old.purpose)) {
        const details = cleanPurposeDetails(old.purpose, old.details?.[old.purpose]);
        return { recent: [{ purpose: old.purpose, details }], fields: {} };
      }
    }
  } catch {
    // Unreadable storage is the same as nothing remembered.
  }
  return { recent: [], fields: {} };
}

/** The last few distinct answers (purpose and its details), newest first. Never applied by itself. */
export function loadRecentAnswers(): RecentAnswer[] {
  return readMemory().recent;
}

/** Past answers a text field can offer, newest first. */
export function loadFieldHistory(key: string): string[] {
  return readMemory().fields[key] ?? [];
}

/** Remembers what the student gave when they moved on. */
export function rememberAnswer(answer: RecentAnswer): void {
  try {
    const memory = readMemory();
    const details = cleanPurposeDetails(answer.purpose, answer.details);
    const same = (item: RecentAnswer) =>
      item.purpose === answer.purpose && JSON.stringify(item.details) === JSON.stringify(details);
    memory.recent = [
      { purpose: answer.purpose, details },
      ...memory.recent.filter((i) => !same(i)),
    ].slice(0, RECENT_LIMIT);
    for (const [key, value] of Object.entries(details)) {
      const list = memory.fields[key] ?? [];
      memory.fields[key] = [
        value,
        ...list.filter((v) => v.toLowerCase() !== value.toLowerCase()),
      ].slice(0, FIELD_LIMIT);
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Private windows and blocked storage just mean nothing is remembered.
  }
}

/** Only the sub-form's own non-empty answers, trimmed: what goes to the pipeline. */
export function cleanPurposeDetails(
  purpose: Purpose,
  details: Record<string, string> | undefined,
): Record<string, string> {
  const allowed = optionFor(purpose)?.fields ?? [];
  const clean: Record<string, string> = {};
  for (const { key } of allowed) {
    const value = details?.[key]?.trim();
    if (value) clean[key] = value;
  }
  return clean;
}

/** Every required extra field of this purpose has an answer. */
export function detailsComplete(purpose: Purpose, details: Record<string, string> | undefined) {
  const clean = cleanPurposeDetails(purpose, details);
  return (optionFor(purpose)?.fields ?? []).every((field) => field.optional || clean[field.key]);
}

/** "Class · MME 2202": how a recent answer reads in the pill's menu. */
export function describeRecent(answer: RecentAnswer): { purpose: string; detail: string } {
  const option = optionFor(answer.purpose);
  const detail = Object.values(cleanPurposeDetails(answer.purpose, answer.details))[0] ?? '';
  return { purpose: option?.label ?? 'Something else', detail };
}
