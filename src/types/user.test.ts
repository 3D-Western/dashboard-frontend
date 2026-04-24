import { describe, it, expect } from 'vitest';
import { isAdmin, hasPermission, User, Group } from './user';

const makeUser = (overrides: Partial<User> = {}): User => ({
  studentId: 251000001,
  email: 'test@uwo.ca',
  firstName: 'John',
  lastName: 'Doe',
  groups: [],
  permissions: [],
  ...overrides,
});

const makeGroup = (groupKey: string): Group => ({
  id: 1,
  groupKey,
  name: groupKey,
  description: null,
  isSystem: true,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
});

describe('isAdmin', () => {
  it('returns true for a user in super_admins group', () => {
    const user = makeUser({ groups: [makeGroup('super_admins')] });
    expect(isAdmin(user)).toBe(true);
  });

  it('returns false for a user in members group only', () => {
    const user = makeUser({ groups: [makeGroup('members')] });
    expect(isAdmin(user)).toBe(false);
  });

  it('returns false for a user with no groups', () => {
    const user = makeUser({ groups: [] });
    expect(isAdmin(user)).toBe(false);
  });
});

describe('hasPermission', () => {
  it('returns true when user has the permission', () => {
    const user = makeUser({ permissions: ['users:list', 'jobs:list'] });
    expect(hasPermission(user, 'users:list')).toBe(true);
  });

  it('returns false when user does not have the permission', () => {
    const user = makeUser({ permissions: ['jobs:list'] });
    expect(hasPermission(user, 'users:list')).toBe(false);
  });

  it('returns false when user has no permissions', () => {
    const user = makeUser({ permissions: [] });
    expect(hasPermission(user, 'users:list')).toBe(false);
  });

  it('is case-sensitive', () => {
    const user = makeUser({ permissions: ['users:list'] });
    expect(hasPermission(user, 'Users:List')).toBe(false);
  });
});
