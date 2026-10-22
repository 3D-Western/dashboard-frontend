import type { SignoffStaff, SignoffStudent } from '@/types/signoff';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "12 minutes ago", "3 hours ago", "2 days ago". */
export function formatAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = now.getTime() - then;
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(diff / DAY);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** "Alex Smith", or the email when the account has no name. */
export function personName(
  person: Pick<SignoffStudent, 'firstName' | 'lastName'> & Partial<Pick<SignoffStudent, 'email'>>,
  fallback = 'Unnamed student',
): string {
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
  return name || person.email || fallback;
}

export const staffName = (person: SignoffStaff) => personName(person, 'a supervisor');

/** A date and time such as "Oct 20, 2026, 3:45 PM". */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
