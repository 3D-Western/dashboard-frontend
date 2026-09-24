import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@test/utils/render';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './index';
import { createMockUser, createMockAdmin, perm } from '@test/utils/mockFactories';
import { PERMISSIONS } from '@/constants/permissions';
import { User } from '@/types/user';

function renderSidebar(user: User) {
  return render(
    <SidebarProvider>
      <AppSidebar user={user} />
    </SidebarProvider>,
  );
}

describe('AppSidebar', () => {
  describe('navigation items visible to all users', () => {
    it('shows Dashboard, Print History, My Jobs, and New Job links', () => {
      const user = createMockUser();
      renderSidebar(user);

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /print history/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my jobs/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /new job/i })).toBeInTheDocument();
    });

    // Launch-scope regression: Equipment Booking exists in the codebase but isn't part of the
    // initial launch — see docs/LAUNCH_SCOPE.md.
    it('never shows the Equipment Booking link', () => {
      const user = createMockUser();
      renderSidebar(user);

      expect(
        screen.queryByRole('link', { name: /equipment booking/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('admin section visibility', () => {
    it('hides admin section for regular members', () => {
      const user = createMockUser();
      renderSidebar(user);

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /job management/i })).not.toBeInTheDocument();
    });

    it('shows admin section for super_admins with all permissions', () => {
      const admin = createMockAdmin({
        permissions: [perm(PERMISSIONS.JOBS_UPDATE_STATUS), perm(PERMISSIONS.INVITATIONS_LIST)],
      });
      renderSidebar(admin);

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  describe('admin item permission-based filtering', () => {
    it('shows Job Management only when user has jobs:update_status', () => {
      const admin = createMockAdmin({ permissions: [perm(PERMISSIONS.JOBS_UPDATE_STATUS)] });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /job management/i })).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /invitation management/i }),
      ).not.toBeInTheDocument();
    });

    it('shows Invitation Management only when user has invitations:list', () => {
      const admin = createMockAdmin({ permissions: [perm(PERMISSIONS.INVITATIONS_LIST)] });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /invitation management/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /job management/i })).not.toBeInTheDocument();
    });

    it('shows User Management only when user has users:list', () => {
      const admin = createMockAdmin({ permissions: [perm(PERMISSIONS.USERS_LIST)] });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /^user management$/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /job management/i })).not.toBeInTheDocument();
    });

    it('shows all admin items when user has all relevant permissions', () => {
      const admin = createMockAdmin({
        permissions: [perm(PERMISSIONS.JOBS_UPDATE_STATUS), perm(PERMISSIONS.INVITATIONS_LIST)],
      });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /job management/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /invitation management/i })).toBeInTheDocument();
    });

    it('does not show Job Management for a regular member permission set (regression: jobs:list is granted to members too, jobs:update_status is not)', () => {
      const member = createMockAdmin({
        permissions: [perm(PERMISSIONS.JOBS_LIST), perm(PERMISSIONS.BOOKINGS_READ)],
      });
      renderSidebar(member);

      expect(screen.queryByRole('link', { name: /job management/i })).not.toBeInTheDocument();
    });

    it('shows Admin Dashboard when user has any relevant admin permission', () => {
      const admin = createMockAdmin({ permissions: [perm(PERMISSIONS.JOBS_UPDATE_STATUS)] });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument();
    });

    it('hides admin section when user has no admin permissions', () => {
      const admin = createMockAdmin({ permissions: [] });
      renderSidebar(admin);

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    // Launch-scope regression: these items exist in the codebase (IAM Management, Audit Log,
    // Equipment Bookings, Booking Requests, Equipment Management) but aren't part of the initial
    // launch — see docs/LAUNCH_SCOPE.md. Even a user with every permission that used to gate them
    // should never see them in the sidebar. (User Management was restored — see the positive
    // tests above.)
    it('never shows launch-scope-excluded admin items, even with every permission that used to gate them', () => {
      const admin = createMockAdmin({
        permissions: [
          perm(PERMISSIONS.USERS_LIST),
          perm(PERMISSIONS.JOBS_UPDATE_STATUS),
          perm(PERMISSIONS.INVITATIONS_LIST),
          perm(PERMISSIONS.IAM_READ),
          perm(PERMISSIONS.AUDIT_READ),
          perm(PERMISSIONS.BOOKINGS_LIST),
          perm(PERMISSIONS.BOOKINGS_UPDATE_STATUS),
          perm(PERMISSIONS.BOOKINGS_READ),
        ],
      });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /job management/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /invitation management/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^user management$/i })).toBeInTheDocument();

      expect(screen.queryByRole('link', { name: /iam management/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /audit log/i })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /equipment bookings/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /booking requests/i })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /equipment management/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('user footer', () => {
    it('displays the user name and student ID', () => {
      const user = createMockUser({ firstName: 'Jane', lastName: 'Smith', studentId: 251000001 });
      renderSidebar(user);

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('ID: 251000001')).toBeInTheDocument();
    });
  });
});
