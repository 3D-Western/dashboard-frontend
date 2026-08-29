export const INTERESTS = {
  MAKING_AND_FABRICATION: 'making_and_fabrication',
  ENGINEERING_AND_PROTOTYPING: 'engineering_and_prototyping',
  ENTREPRENEURSHIP_AND_STARTUPS: 'entrepreneurship_and_startups',
  RESEARCH: 'research',
  ARTS_AND_CREATIVE_DESIGN: 'arts_and_creative_design',
  ROBOTICS_AND_ELECTRONICS: 'robotics_and_electronics',
  PROGRAMMING_AND_AI: 'programming_and_ai',
  SUSTAINABILITY: 'sustainability',
  LEARNING_NEW_SKILLS: 'learning_new_skills',
  COMPETITIONS: 'competitions',
  CLUBS_AND_STUDENT_TEAMS: 'clubs_and_student_teams',
  OTHER: 'other',
} as const;

export type Interest = (typeof INTERESTS)[keyof typeof INTERESTS];

export const INTEREST_OPTIONS = [
  { value: INTERESTS.MAKING_AND_FABRICATION, label: 'Making & Fabrication' },
  { value: INTERESTS.ENGINEERING_AND_PROTOTYPING, label: 'Engineering & Prototyping' },
  { value: INTERESTS.ENTREPRENEURSHIP_AND_STARTUPS, label: 'Entrepreneurship & Startups' },
  { value: INTERESTS.RESEARCH, label: 'Research' },
  { value: INTERESTS.ARTS_AND_CREATIVE_DESIGN, label: 'Arts & Creative Design' },
  { value: INTERESTS.ROBOTICS_AND_ELECTRONICS, label: 'Robotics & Electronics' },
  { value: INTERESTS.PROGRAMMING_AND_AI, label: 'Programming & AI' },
  { value: INTERESTS.SUSTAINABILITY, label: 'Sustainability' },
  { value: INTERESTS.LEARNING_NEW_SKILLS, label: 'Learning New Skills' },
  { value: INTERESTS.COMPETITIONS, label: 'Competitions' },
  { value: INTERESTS.CLUBS_AND_STUDENT_TEAMS, label: 'Clubs & Student Teams' },
  { value: INTERESTS.OTHER, label: 'Other' },
] as const;
