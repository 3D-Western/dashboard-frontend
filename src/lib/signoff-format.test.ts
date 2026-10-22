import { describe, it, expect } from 'vitest';
import { formatAgo, personName, staffName } from './signoff-format';

const NOW = new Date('2026-10-20T16:30:00Z');

describe('formatAgo', () => {
  it('reads naturally at each scale', () => {
    expect(formatAgo('2026-10-20T16:29:45Z', NOW)).toBe('just now');
    expect(formatAgo('2026-10-20T16:29:00Z', NOW)).toBe('1 minute ago');
    expect(formatAgo('2026-10-20T16:00:00Z', NOW)).toBe('30 minutes ago');
    expect(formatAgo('2026-10-20T15:00:00Z', NOW)).toBe('1 hour ago');
    expect(formatAgo('2026-10-18T16:30:00Z', NOW)).toBe('2 days ago');
  });

  it('is empty for a bad date', () => {
    expect(formatAgo('not a date', NOW)).toBe('');
  });
});

describe('personName', () => {
  it('uses the full name, then the email, then a fallback', () => {
    expect(personName({ firstName: 'Alex', lastName: 'Smith' })).toBe('Alex Smith');
    expect(personName({ firstName: 'Alex', lastName: null })).toBe('Alex');
    expect(personName({ firstName: null, lastName: null, email: 'a@uwo.ca' })).toBe('a@uwo.ca');
    expect(personName({ firstName: null, lastName: null })).toBe('Unnamed student');
    expect(staffName({ studentId: 1, firstName: null, lastName: null })).toBe('a supervisor');
  });
});
