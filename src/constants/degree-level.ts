export const DEGREE_LEVELS = {
  MASTERS: 'masters',
  PHD: 'phd',
} as const;

export type DegreeLevel = (typeof DEGREE_LEVELS)[keyof typeof DEGREE_LEVELS];

export const DEGREE_LEVEL_OPTIONS = [
  { value: DEGREE_LEVELS.MASTERS, label: "Master's" },
  { value: DEGREE_LEVELS.PHD, label: 'PhD' },
] as const;
