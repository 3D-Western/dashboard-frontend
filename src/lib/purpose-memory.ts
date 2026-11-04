import type { Purpose } from '@/types/pipeline';

// The purpose question and its ultra-short sub-form (SCOPE §2.3). What a student answered last
// time is remembered in this browser and offered again; nothing is sent until they save a job.

export interface PurposeField {
  key: string;
  label: string;
  placeholder: string;
}

export interface PurposeOption {
  value: Purpose;
  label: string;
  fields: PurposeField[];
}

export const PURPOSES: PurposeOption[] = [
  {
    value: 'venture',
    label: 'Startup or venture',
    fields: [
      {
        key: 'venture_name',
        label: 'Venture or business name',
        placeholder: 'e.g. Maple Gear Co.',
      },
      {
        key: 'venture_type',
        label: 'What kind of business?',
        placeholder: 'e.g. consumer product',
      },
    ],
  },
  {
    value: 'class',
    label: 'Class project',
    fields: [
      { key: 'course', label: 'Course', placeholder: 'e.g. MME 4499' },
      { key: 'project', label: 'Project', placeholder: 'e.g. capstone robot arm' },
    ],
  },
  {
    value: 'personal',
    label: 'Personal project',
    fields: [
      { key: 'project_name', label: 'Project name', placeholder: 'e.g. desk organiser' },
      { key: 'project_type', label: 'Type of project', placeholder: 'e.g. hobby, repair, gift' },
    ],
  },
  {
    value: 'other',
    label: 'Something else',
    fields: [{ key: 'note', label: 'In a few words', placeholder: 'e.g. club event prop' }],
  },
];

export interface RememberedPurpose {
  purpose: Purpose;
  /** Sub-form answers per purpose, so switching back and forth keeps what was typed. */
  details: Partial<Record<Purpose, Record<string, string>>>;
}

const STORAGE_KEY = '3dw.printFlow.purpose.v1';

const isPurpose = (value: unknown): value is Purpose =>
  PURPOSES.some((option) => option.value === value);

export function loadRememberedPurpose(): RememberedPurpose | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedPurpose>;
    if (!isPurpose(parsed.purpose)) return null;
    return { purpose: parsed.purpose, details: parsed.details ?? {} };
  } catch {
    return null;
  }
}

export function rememberPurpose(value: RememberedPurpose): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private windows and blocked storage just mean nothing is remembered.
  }
}

/** Only the sub-form's own non-empty answers, trimmed: what goes to the pipeline. */
export function cleanPurposeDetails(
  purpose: Purpose,
  details: Record<string, string> | undefined,
): Record<string, string> {
  const allowed = PURPOSES.find((option) => option.value === purpose)?.fields ?? [];
  const clean: Record<string, string> = {};
  for (const { key } of allowed) {
    const value = details?.[key]?.trim();
    if (value) clean[key] = value;
  }
  return clean;
}
