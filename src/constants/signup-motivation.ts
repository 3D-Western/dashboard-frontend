export const SIGNUP_MOTIVATIONS = {
  COURSE_REQUIREMENT: 'course_requirement',
  PERSONAL_PROJECT: 'personal_project',
  RESEARCH: 'research',
  STARTUP: 'startup',
  WORKSHOP: 'workshop',
  LEARN_NEW_SKILL: 'learn_new_skill',
  FRIEND_RECOMMENDED: 'friend_recommended',
  JUST_EXPLORING: 'just_exploring',
  OTHER: 'other',
} as const;

export type SignupMotivation = (typeof SIGNUP_MOTIVATIONS)[keyof typeof SIGNUP_MOTIVATIONS];

export const SIGNUP_MOTIVATION_OPTIONS = [
  { value: SIGNUP_MOTIVATIONS.COURSE_REQUIREMENT, label: 'Course Requirement' },
  { value: SIGNUP_MOTIVATIONS.PERSONAL_PROJECT, label: 'Personal Project' },
  { value: SIGNUP_MOTIVATIONS.RESEARCH, label: 'Research' },
  { value: SIGNUP_MOTIVATIONS.STARTUP, label: 'Startup' },
  { value: SIGNUP_MOTIVATIONS.WORKSHOP, label: 'Workshop' },
  { value: SIGNUP_MOTIVATIONS.LEARN_NEW_SKILL, label: 'Learn a New Skill' },
  { value: SIGNUP_MOTIVATIONS.FRIEND_RECOMMENDED, label: 'Friend Recommended' },
  { value: SIGNUP_MOTIVATIONS.JUST_EXPLORING, label: 'Just Exploring' },
  { value: SIGNUP_MOTIVATIONS.OTHER, label: 'Other' },
] as const;
