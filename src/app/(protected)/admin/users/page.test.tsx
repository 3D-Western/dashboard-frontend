import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@test/utils/render';
import { createMockAdmin, createMockPendingInvitation, perm } from '@test/utils/mockFactories';
import { PERMISSIONS } from '@/constants/permissions';
import type { User } from '@/types/user';
import type { PaginationMetadata } from '@/types/common';

const validateSession = vi.fn();
const listAdminUsers = vi.fn();
const listInvitations = vi.fn();

vi.mock('@/lib/auth', () => ({ validateSession: () => validateSession() }));
vi.mock('@/api/client/user', () => ({
  userApi: { listAdminUsers: (...args: unknown[]) => listAdminUsers(...args) },
}));
vi.mock('@/api/client/invitation', () => ({
  invitationApi: { listInvitations: (...args: unknown[]) => listInvitations(...args) },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/users',
  redirect: vi.fn(),
}));

import UserManagementPage from './page';

const pagination: PaginationMetadata = {
  page: 1,
  pageSize: 10,
  totalItems: 1,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
  snapshotCreatedBefore: new Date().toISOString(),
};

const adminWith = (...keys: string[]): User =>
  createMockAdmin({ permissions: keys.map((key) => perm(key)) });

async function renderPage(user: User | null, searchParams: Record<string, string> = {}) {
  validateSession.mockResolvedValue(user);
  const page = await UserManagementPage({ searchParams: Promise.resolve(searchParams) });
  return render(page, { user });
}

describe('User Management page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAdminUsers.mockResolvedValue({ data: [], pagination });
    listInvitations.mockResolvedValue({
      data: [createMockPendingInvitation({ email: 'jane@example.com' })],
      pagination,
    });
  });

  it('shows the Users and Invitations tabs and the add action to an admin who can invite', async () => {
    await renderPage(
      adminWith(
        PERMISSIONS.USERS_LIST,
        PERMISSIONS.INVITATIONS_LIST,
        PERMISSIONS.INVITATIONS_CREATE,
      ),
    );

    expect(screen.getByRole('tab', { name: 'Users', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Invitations', selected: false })).toHaveAttribute(
      'href',
      '/admin/users?tab=invitations',
    );
    expect(screen.getByRole('button', { name: /add a non-western member/i })).toBeInTheDocument();
    expect(listAdminUsers).toHaveBeenCalled();
    expect(listInvitations).not.toHaveBeenCalled();
  });

  it('shows the invitations list (pending, used, expired) on the Invitations tab', async () => {
    await renderPage(
      adminWith(
        PERMISSIONS.USERS_LIST,
        PERMISSIONS.INVITATIONS_LIST,
        PERMISSIONS.INVITATIONS_CREATE,
      ),
      { tab: 'invitations', status: 'PENDING' },
    );

    expect(screen.getByRole('tab', { name: 'Invitations', selected: true })).toBeInTheDocument();
    expect(listInvitations).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING', page: 1 }),
    );
    expect(listAdminUsers).not.toHaveBeenCalled();
    expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0);
    expect(screen.getByRole('table', { name: /invitations table/i })).toBeInTheDocument();
  });

  it('keeps the invitations list away from someone without invitations:list', async () => {
    await renderPage(adminWith(PERMISSIONS.USERS_LIST), { tab: 'invitations' });

    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(listInvitations).not.toHaveBeenCalled();
    expect(listAdminUsers).toHaveBeenCalled();
  });

  it('hides the add action from someone who cannot create invitations', async () => {
    await renderPage(adminWith(PERMISSIONS.USERS_LIST, PERMISSIONS.INVITATIONS_LIST));

    expect(
      screen.queryByRole('button', { name: /add a non-western member/i }),
    ).not.toBeInTheDocument();
  });

  it('refuses someone without users:list', async () => {
    await renderPage(adminWith(PERMISSIONS.INVITATIONS_LIST, PERMISSIONS.INVITATIONS_CREATE));

    expect(
      screen.queryByRole('button', { name: /add a non-western member/i }),
    ).not.toBeInTheDocument();
    expect(listAdminUsers).not.toHaveBeenCalled();
    expect(listInvitations).not.toHaveBeenCalled();
  });
});
