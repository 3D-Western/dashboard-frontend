import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@test/utils/render';
import { createMockAdmin, perm } from '@test/utils/mockFactories';
import { PERMISSIONS } from '@/constants/permissions';
import { AdminUserProfile } from '@/types/user';
import { PaginationMetadata } from '@/types/common';
import UsersTable from './index';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const pagination: PaginationMetadata = {
  page: 1,
  pageSize: 10,
  totalItems: 2,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
  snapshotCreatedBefore: new Date().toISOString(),
};

const profile = (overrides: Partial<AdminUserProfile>): AdminUserProfile => ({
  studentId: 251000001,
  email: 'student@uwo.ca',
  firstName: 'Other',
  lastName: 'Student',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  experienceLevel: null,
  faculty: 'science',
  accountStatus: 'Active',
  accountStatusReason: null,
  ...overrides,
});

describe('UsersTable account status actions', () => {
  const admin = createMockAdmin({
    studentId: 251000000,
    permissions: [perm(PERMISSIONS.USERS_LIST), perm(PERMISSIONS.USERS_UPDATE_STATUS)],
  });
  const users = [
    profile({ studentId: 251000000, firstName: 'Admin', lastName: 'Self' }),
    profile({ studentId: 251000001, firstName: 'Other', lastName: 'Student' }),
  ];

  it("lets an admin change another user's status", async () => {
    const user = userEvent.setup();
    render(<UsersTable users={users} pagination={pagination} />, { user: admin });

    await user.click(screen.getByRole('button', { name: /actions for other student/i }));

    expect(screen.getByRole('menuitem', { name: /change account status/i })).toBeEnabled();
  });

  it('does not let an admin change their own status', async () => {
    const user = userEvent.setup();
    render(<UsersTable users={users} pagination={pagination} />, { user: admin });

    await user.click(screen.getByRole('button', { name: /actions for admin self/i }));

    expect(
      screen.queryByRole('menuitem', { name: /change account status/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /can't change your own status/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
