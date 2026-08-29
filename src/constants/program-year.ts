// Placeholder values — the source questionnaire doesn't enumerate exact Year options yet.
// Flag with the stakeholder/PM before treating this list as final.
export const PROGRAM_YEARS = {
  YEAR_1: 'year_1',
  YEAR_2: 'year_2',
  YEAR_3: 'year_3',
  YEAR_4: 'year_4',
  YEAR_5_PLUS: 'year_5_plus',
} as const;

export type ProgramYear = (typeof PROGRAM_YEARS)[keyof typeof PROGRAM_YEARS];

export const PROGRAM_YEAR_OPTIONS = [
  { value: PROGRAM_YEARS.YEAR_1, label: 'Year 1' },
  { value: PROGRAM_YEARS.YEAR_2, label: 'Year 2' },
  { value: PROGRAM_YEARS.YEAR_3, label: 'Year 3' },
  { value: PROGRAM_YEARS.YEAR_4, label: 'Year 4' },
  { value: PROGRAM_YEARS.YEAR_5_PLUS, label: '5th Year+' },
] as const;
