/**
 * Faculty constants - Single source of truth
 * Matches backend Faculty enum values
 */

export const FACULTIES = {
  UNDECLARED: 'undeclared',
  ARTS_AND_HUMANITIES: 'arts_and_humanities',
  MUSIC: 'music',
  EDUCATION: 'education',
  ENGINEERING: 'engineering',
  HEALTH_SCIENCES: 'health_sciences',
  INFORMATION_AND_MEDIA_STUDIES: 'information_and_media_studies',
  IVEY_BUSINESS_SCHOOL: 'ivey_business_school',
  LAW: 'law',
  SCHULICH_MEDICINE_AND_DENTISTRY: 'schulich_medicine_and_dentistry',
  SCIENCE: 'science',
  SOCIAL_SCIENCE: 'social_science',
} as const;

export type Faculty = (typeof FACULTIES)[keyof typeof FACULTIES];

export const FACULTY_OPTIONS = [
  { value: FACULTIES.UNDECLARED, label: 'Undeclared' },
  { value: FACULTIES.ARTS_AND_HUMANITIES, label: 'Arts and Humanities' },
  { value: FACULTIES.MUSIC, label: 'Music' },
  { value: FACULTIES.EDUCATION, label: 'Education' },
  { value: FACULTIES.ENGINEERING, label: 'Engineering' },
  { value: FACULTIES.HEALTH_SCIENCES, label: 'Health Sciences' },
  {
    value: FACULTIES.INFORMATION_AND_MEDIA_STUDIES,
    label: 'Information and Media Studies',
  },
  { value: FACULTIES.IVEY_BUSINESS_SCHOOL, label: 'Ivey Business School' },
  { value: FACULTIES.LAW, label: 'Law' },
  {
    value: FACULTIES.SCHULICH_MEDICINE_AND_DENTISTRY,
    label: 'Schulich Medicine and Dentistry',
  },
  { value: FACULTIES.SCIENCE, label: 'Science' },
  { value: FACULTIES.SOCIAL_SCIENCE, label: 'Social Science' },
] as const;
