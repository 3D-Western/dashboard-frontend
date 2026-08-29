export const REFERRAL_SOURCES = {
  FRIEND: 'friend',
  PROFESSOR: 'professor',
  ORIENTATION: 'orientation',
  CLUB_FAIR: 'club_fair',
  SOCIAL_MEDIA: 'social_media',
  WEBSITE: 'website',
  POSTER: 'poster',
  EVENT: 'event',
  OTHER: 'other',
} as const;

export type ReferralSource = (typeof REFERRAL_SOURCES)[keyof typeof REFERRAL_SOURCES];

export const REFERRAL_SOURCE_OPTIONS = [
  { value: REFERRAL_SOURCES.FRIEND, label: 'Friend' },
  { value: REFERRAL_SOURCES.PROFESSOR, label: 'Professor' },
  { value: REFERRAL_SOURCES.ORIENTATION, label: 'Orientation' },
  { value: REFERRAL_SOURCES.CLUB_FAIR, label: 'Club Fair' },
  { value: REFERRAL_SOURCES.SOCIAL_MEDIA, label: 'Social Media' },
  { value: REFERRAL_SOURCES.WEBSITE, label: 'Website' },
  { value: REFERRAL_SOURCES.POSTER, label: 'Poster' },
  { value: REFERRAL_SOURCES.EVENT, label: 'Event' },
  { value: REFERRAL_SOURCES.OTHER, label: 'Other' },
] as const;
