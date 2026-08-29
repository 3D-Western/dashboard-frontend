export const COMMUNICATION_PREFERENCES = {
  WORKSHOPS_AND_EVENTS: 'workshops_and_events',
  NEW_EQUIPMENT: 'new_equipment',
  MAKERSPACE_NEWS: 'makerspace_news',
  VOLUNTEER_OPPORTUNITIES: 'volunteer_opportunities',
  COMPETITIONS: 'competitions',
  ENTREPRENEURSHIP_OPPORTUNITIES: 'entrepreneurship_opportunities',
  GENERAL_ANNOUNCEMENTS: 'general_announcements',
} as const;

export type CommunicationPreference =
  (typeof COMMUNICATION_PREFERENCES)[keyof typeof COMMUNICATION_PREFERENCES];

export const COMMUNICATION_PREFERENCE_OPTIONS = [
  { value: COMMUNICATION_PREFERENCES.WORKSHOPS_AND_EVENTS, label: 'Workshops & Events' },
  { value: COMMUNICATION_PREFERENCES.NEW_EQUIPMENT, label: 'New Equipment' },
  { value: COMMUNICATION_PREFERENCES.MAKERSPACE_NEWS, label: 'Makerspace News' },
  { value: COMMUNICATION_PREFERENCES.VOLUNTEER_OPPORTUNITIES, label: 'Volunteer Opportunities' },
  { value: COMMUNICATION_PREFERENCES.COMPETITIONS, label: 'Competitions' },
  {
    value: COMMUNICATION_PREFERENCES.ENTREPRENEURSHIP_OPPORTUNITIES,
    label: 'Entrepreneurship Opportunities',
  },
  { value: COMMUNICATION_PREFERENCES.GENERAL_ANNOUNCEMENTS, label: 'General Announcements' },
] as const;
