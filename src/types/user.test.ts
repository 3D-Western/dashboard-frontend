import { describe, it, expect } from 'vitest';
import { hasAnyAdminPermission, hasPermission, User } from './user';

const p = (key: string) => ({ key, scopeKey: 'any' });

const makeUser = (overrides: Partial<User> = {}): User => ({
  studentId: 251000001,
  email: 'test@uwo.ca',
  firstName: 'John',
  lastName: 'Doe',
  groups: [],
  permissions: [],
  ...overrides,
});

describe('hasAnyAdminPermission', () => {
  it('returns true when user has an admin section permission', () => {
    const user = makeUser({ permissions: [p('users:list')] });
    expect(hasAnyAdminPermission(user)).toBe(true);
  });

  it('returns false when user has only non-admin permissions', () => {
    const user = makeUser({ permissions: [p('jobs:create'), p('files:download')] });
    expect(hasAnyAdminPermission(user)).toBe(false);
  });

  it('returns false when user has no permissions', () => {
    const user = makeUser({ permissions: [] });
    expect(hasAnyAdminPermission(user)).toBe(false);
  });

  it('returns false for a regular member with only bookings:read (regression: this permission is granted to all members for the booking calendar and must not be treated as an admin signal)', () => {
    const user = makeUser({ permissions: [p('bookings:read')] });
    expect(hasAnyAdminPermission(user)).toBe(false);
  });

  it('returns false for a regular member with only jobs:list (regression: own-scoped job listing must not be treated as an admin signal)', () => {
    const user = makeUser({ permissions: [p('jobs:list')] });
    expect(hasAnyAdminPermission(user)).toBe(false);
  });

  it('returns false for the full real member permission set (regression: matches src/api/mocks/utils.ts MEMBER_PERMISSIONS exactly)', () => {
    const user = makeUser({
      permissions: [
        p('jobs:create'),
        p('jobs:list'),
        p('jobs:read'),
        p('jobs:delete'),
        p('jobs:complete_upload'),
        p('jobs:retry_upload'),
        p('jobs:reorder'),
        p('files:read_metadata'),
        p('files:download'),
        p('users:update_profile'),
        p('bookings:read'),
      ],
    });
    expect(hasAnyAdminPermission(user)).toBe(false);
  });
});

describe('hasPermission', () => {
  it('returns true when user has the permission', () => {
    const user = makeUser({ permissions: [p('users:list'), p('jobs:list')] });
    expect(hasPermission(user, 'users:list')).toBe(true);
  });

  it('returns false when user does not have the permission', () => {
    const user = makeUser({ permissions: [p('jobs:list')] });
    expect(hasPermission(user, 'users:list')).toBe(false);
  });

  it('returns false when user has no permissions', () => {
    const user = makeUser({ permissions: [] });
    expect(hasPermission(user, 'users:list')).toBe(false);
  });

  it('is case-sensitive', () => {
    const user = makeUser({ permissions: [p('users:list')] });
    expect(hasPermission(user, 'Users:List')).toBe(false);
  });
});
