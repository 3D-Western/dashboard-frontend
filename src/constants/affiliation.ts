export const AFFILIATIONS = {
  UNDERGRADUATE: 'undergraduate',
  GRADUATE: 'graduate',
  STAFF: 'staff',
  ALUMNI: 'alumni',
  COMMUNITY_MEMBER: 'community_member',
  OTHER: 'other',
} as const;

export type Affiliation = (typeof AFFILIATIONS)[keyof typeof AFFILIATIONS];

export const AFFILIATION_OPTIONS = [
  { value: AFFILIATIONS.UNDERGRADUATE, label: 'Undergraduate' },
  { value: AFFILIATIONS.GRADUATE, label: 'Graduate' },
  { value: AFFILIATIONS.STAFF, label: 'Staff' },
  { value: AFFILIATIONS.ALUMNI, label: 'Alumni' },
  { value: AFFILIATIONS.COMMUNITY_MEMBER, label: 'Community Member' },
  { value: AFFILIATIONS.OTHER, label: 'Other' },
] as const;
