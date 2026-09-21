/**
 * Experience level constants - Single source of truth
 * Values match the backend ExperienceLevel enum names exactly
 * (NoExperience, Beginner, Advanced).
 */

export const EXPERIENCE_LEVELS = {
  NO_EXPERIENCE: 'NoExperience',
  BEGINNER: 'Beginner',
  ADVANCED: 'Advanced',
} as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[keyof typeof EXPERIENCE_LEVELS];

export const EXPERIENCE_LEVEL_OPTIONS = [
  { value: EXPERIENCE_LEVELS.NO_EXPERIENCE, label: 'No Experience' },
  { value: EXPERIENCE_LEVELS.BEGINNER, label: 'Beginner' },
  { value: EXPERIENCE_LEVELS.ADVANCED, label: 'Advanced' },
] as const;
