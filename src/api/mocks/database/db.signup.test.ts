import { describe, it, expect } from 'vitest';
import db from './db';

const baseInput = {
  studentId: 251999901,
  email: 'newuser@uwo.ca',
  password: 'password123',
  firstName: 'New',
  lastName: 'User',
};

describe('Database signup/verification methods', () => {
  it('creates a new user as unverified', () => {
    const result = db.createUser(baseInput);

    expect(result).not.toBe('DUPLICATE_STUDENT_ID');
    expect(result).not.toBe('DUPLICATE_EMAIL');
    if (typeof result !== 'string') {
      expect(result.emailVerified).toBe(false);
      expect(result.groups).toEqual(['members']);
    }
  });

  it('rejects a duplicate studentId', () => {
    db.createUser(baseInput);

    const result = db.createUser({ ...baseInput, email: 'different@uwo.ca' });

    expect(result).toBe('DUPLICATE_STUDENT_ID');
  });

  it('rejects a duplicate email', () => {
    db.createUser(baseInput);

    const result = db.createUser({ ...baseInput, studentId: 251999902 });

    expect(result).toBe('DUPLICATE_EMAIL');
  });

  it('round-trips a verification token: created, valid once, then consumed', () => {
    const user = db.createUser({
      ...baseInput,
      studentId: 251999903,
      email: 'tokentest@uwo.ca',
    });
    if (typeof user === 'string') throw new Error('expected a created user');

    const token = db.createVerificationToken(user.studentId);
    const verified = db.verifyEmailToken(token);

    expect(verified?.emailVerified).toBe(true);
    expect(db.verifyEmailToken(token)).toBeNull();
  });

  it('returns null for an unknown verification token', () => {
    expect(db.verifyEmailToken('not-a-real-token')).toBeNull();
  });

  it('does not retroactively block existing seeded users from login (emailVerified unset)', () => {
    const seededUser = db.getUserById(251000002);
    expect(seededUser?.emailVerified).not.toBe(false);
  });
});
