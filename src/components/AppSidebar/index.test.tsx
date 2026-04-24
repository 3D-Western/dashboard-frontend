import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@test/utils/render';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './index';
import { createMockUser, createMockAdmin } from '@test/utils/mockFactories';
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
    it('shows Dashboard, My Jobs, and New Job links', () => {
      const user = createMockUser();
      renderSidebar(user);

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my jobs/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /new job/i })).toBeInTheDocument();
    });
  });

  describe('admin section visibility', () => {
    it('hides admin section for regular members', () => {
      const user = createMockUser();
      renderSidebar(user);

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /user management/i })).not.toBeInTheDocument();
    });

    it('shows admin section for super_admins with all permissions', () => {
      const admin = createMockAdmin({
        permissions: [
          PERMISSIONS.USERS_LIST,
          PERMISSIONS.JOBS_LIST,
          PERMISSIONS.INVITATIONS_LIST,
        ],
      });
      renderSidebar(admin);

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  describe('admin item permission-based filtering', () => {
    it('shows User Management only when user has users:list', () => {
      const admin = createMockAdmin({ permissions: [PERMISSIONS.USERS_LIST] });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /user management/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /job management/i })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /invitation management/i }),
      ).not.toBeInTheDocument();
    });

    it('shows Job Management only when user has jobs:list', () => {
      const admin = createMockAdmin({ permissions: [PERMISSIONS.JOBS_LIST] });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /job management/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /user management/i })).not.toBeInTheDocument();
    });

    it('shows Invitation Management only when user has invitations:list', () => {
      const admin = createMockAdmin({ permissions: [PERMISSIONS.INVITATIONS_LIST] });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /invitation management/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /user management/i })).not.toBeInTheDocument();
    });

    it('shows all admin items when user has all relevant permissions', () => {
      const admin = createMockAdmin({
        permissions: [
          PERMISSIONS.USERS_LIST,
          PERMISSIONS.JOBS_LIST,
          PERMISSIONS.INVITATIONS_LIST,
        ],
      });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /user management/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /job management/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /invitation management/i })).toBeInTheDocument();
    });

    it('always shows Admin Dashboard to admins regardless of permissions', () => {
      const admin = createMockAdmin({ permissions: [] });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument();
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
