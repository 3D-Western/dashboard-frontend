import { BookingStatus } from '@/types/booking';

// Single source of truth for how a booking status is colored - badges (BookingList,
// BookingStatusTracker, BookingDetailModal/BookingDetailContent) and the calendar
// event colors (BookingCalendar) both derive from this instead of hand-rolling
// their own status->color mapping.
export const BOOKING_STATUS_BADGE_CLASSES: Record<BookingStatus, string> = {
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
};

export const BOOKING_CALENDAR_EVENT_COLORS: Record<
  BookingStatus,
  { background: string; border: string }
> = {
  PENDING: { background: '#facc15', border: '#eab308' },
  APPROVED: { background: '#22c55e', border: '#16a34a' },
  REJECTED: { background: '#ef4444', border: '#dc2626' },
  CANCELLED: { background: '#ef4444', border: '#dc2626' },
};
