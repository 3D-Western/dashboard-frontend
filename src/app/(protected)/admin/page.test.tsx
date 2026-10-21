import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@test/utils/render';
import { createMockAdmin, perm } from '@test/utils/mockFactories';
import { PERMISSIONS } from '@/constants/permissions';

const validateSession = vi.fn();
vi.mock('@/lib/auth', () => ({ validateSession: () => validateSession() }));

import AdminDashboardPage from './page';

describe('Admin dashboard tiles', () => {
  it('has no Invitation Management tile: invitations live inside User Management', async () => {
    const admin = createMockAdmin({
      permissions: [
        perm(PERMISSIONS.USERS_LIST),
        perm(PERMISSIONS.INVITATIONS_LIST),
        perm(PERMISSIONS.INVITATIONS_CREATE),
      ],
    });
    validateSession.mockResolvedValue(admin);

    render(await AdminDashboardPage(), { user: admin });

    expect(screen.queryByText(/invitation management/i)).not.toBeInTheDocument();
    const tile = screen.getByRole('link', { name: /user management/i });
    expect(tile).toHaveAttribute('href', '/admin/users');
    expect(tile).toHaveTextContent(/without a western email/i);
  });
});
