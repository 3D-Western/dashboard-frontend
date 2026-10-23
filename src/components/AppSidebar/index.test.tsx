import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@test/utils/render';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './index';
import { createMockUser, createMockAdmin, perm } from '@test/utils/mockFactories';
import { PERMISSIONS } from '@/constants/permissions';
import { User } from '@/types/user';

// The current path, changed by the tests that move between pages.
const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

function sidebar(user: User) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
    </SidebarProvider>
  );
}

// Most tests here are about the admin links, so they start on an admin page (section open).
function renderSidebar(user: User, pathname = '/admin') {
  nav.pathname = pathname;
  return render(sidebar(user));
}

describe('AppSidebar', () => {
  describe('navigation items visible to all users', () => {
    it('shows the Dashboard link', () => {
      const user = createMockUser();
      renderSidebar(user);

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    });

    // Launch-scope regression: print jobs aren't supported at launch — see docs/LAUNCH_SCOPE.md.
    it('never shows the My Jobs link', () => {
      const user = createMockUser();
      renderSidebar(user);

      expect(screen.queryByRole('link', { name: /my jobs/i })).not.toBeInTheDocument();
    });

    it('shows a Training link to the training page', () => {
      const user = createMockUser();
      renderSidebar(user);

      expect(screen.getByRole('link', { name: /^training$/i })).toHaveAttribute(
        'href',
        '/dashboard/training',
      );
    });

    // Print History and New Job were merged into My Jobs
    it('no longer shows separate Print History or New Job links', () => {
      const user = createMockUser();
      renderSidebar(user);

      expect(screen.queryByRole('link', { name: /print history/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /new job/i })).not.toBeInTheDocument();
    });

    // Launch-scope regression: Equipment Booking exists in the codebase but isn't part of the
    // initial launch — see docs/LAUNCH_SCOPE.md.
    it('never shows the Equipment Booking link', () => {
      const user = createMockUser();
      renderSidebar(user);

      expect(screen.queryByRole('link', { name: /equipment booking/i })).not.toBeInTheDocument();
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

    it('has no Invitation Management item: invitations live inside User Management', () => {
      const admin = createMockAdmin({
        permissions: [perm(PERMISSIONS.USERS_LIST), perm(PERMISSIONS.INVITATIONS_LIST)],
      });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /^user management$/i })).toBeInTheDocument();
      expect(screen.queryByText(/invitation management/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /invitation/i })).not.toBeInTheDocument();
    });

    it('shows Training Editor to someone who can author trainings', () => {
      const admin = createMockAdmin({ permissions: [perm(PERMISSIONS.TRAINING_AUTHOR)] });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /training editor/i })).toHaveAttribute(
        'href',
        '/admin/training',
      );
      expect(screen.queryByRole('link', { name: /job management/i })).not.toBeInTheDocument();
    });

    it('shows Training Editor to someone who can only publish trainings', () => {
      const admin = createMockAdmin({ permissions: [perm(PERMISSIONS.TRAINING_PUBLISH)] });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /training editor/i })).toBeInTheDocument();
    });

    it('hides Training Editor from admins with other permissions only', () => {
      const admin = createMockAdmin({ permissions: [perm(PERMISSIONS.USERS_LIST)] });
      renderSidebar(admin);

      expect(screen.queryByRole('link', { name: /training editor/i })).not.toBeInTheDocument();
    });

    it('shows User Management only when user has users:list', () => {
      const admin = createMockAdmin({ permissions: [perm(PERMISSIONS.USERS_LIST)] });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /^user management$/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /job management/i })).not.toBeInTheDocument();
    });

    it('shows Training Sign-offs only when user has training:signoff', () => {
      const supervisor = createMockAdmin({ permissions: [perm(PERMISSIONS.TRAINING_SIGNOFF)] });
      renderSidebar(supervisor);

      expect(screen.getByRole('link', { name: /training sign-offs/i })).toHaveAttribute(
        'href',
        '/admin/signoffs',
      );
      expect(screen.queryByRole('link', { name: /job management/i })).not.toBeInTheDocument();
    });

    it('hides Training Sign-offs from admins who lack training:signoff', () => {
      const admin = createMockAdmin({ permissions: [perm(PERMISSIONS.USERS_LIST)] });
      renderSidebar(admin);

      expect(screen.queryByRole('link', { name: /training sign-offs/i })).not.toBeInTheDocument();
    });

    it('shows Access System only when user has access:admin', () => {
      renderSidebar(createMockAdmin({ permissions: [perm(PERMISSIONS.ACCESS_ADMIN)] }));

      expect(screen.getByRole('link', { name: /access system/i })).toHaveAttribute(
        'href',
        '/admin/access',
      );
    });

    it('hides Access System from admins who lack access:admin', () => {
      renderSidebar(createMockAdmin({ permissions: [perm(PERMISSIONS.USERS_LIST)] }));

      expect(screen.queryByRole('link', { name: /access system/i })).not.toBeInTheDocument();
    });

    it('shows all admin items when user has all relevant permissions', () => {
      const admin = createMockAdmin({
        permissions: [perm(PERMISSIONS.JOBS_UPDATE_STATUS), perm(PERMISSIONS.INVITATIONS_LIST)],
      });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /job management/i })).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /invitation management/i }),
      ).not.toBeInTheDocument();
    });

    it('lists the admin pages flat, with no Admin Dashboard link', () => {
      renderSidebar(createMockAdmin({ permissions: [perm(PERMISSIONS.USERS_LIST)] }));

      expect(screen.getByRole('link', { name: /^user management$/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /toggle admin pages/i })).not.toBeInTheDocument();
    });

    it('shows the admin links on member pages too', () => {
      renderSidebar(createMockAdmin({ permissions: [perm(PERMISSIONS.USERS_LIST)] }), '/dashboard');

      expect(screen.getByRole('link', { name: /^user management$/i })).toBeInTheDocument();
    });

    it('does not show Job Management for a regular member permission set (regression: jobs:list is granted to members too, jobs:update_status is not)', () => {
      const member = createMockAdmin({
        permissions: [perm(PERMISSIONS.JOBS_LIST), perm(PERMISSIONS.BOOKINGS_READ)],
      });
      renderSidebar(member);

      expect(screen.queryByRole('link', { name: /job management/i })).not.toBeInTheDocument();
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
      expect(
        screen.queryByRole('link', { name: /invitation management/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^user management$/i })).toBeInTheDocument();

      expect(screen.queryByRole('link', { name: /iam management/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /audit log/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /equipment bookings/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /booking requests/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /equipment management/i })).not.toBeInTheDocument();
    });
  });

  describe('phone tap targets', () => {
    it('makes the admin links 44 px on phones, like the member links', () => {
      const admin = createMockAdmin({ permissions: [perm(PERMISSIONS.USERS_LIST)] });
      renderSidebar(admin);

      expect(screen.getByRole('link', { name: /^user management$/i })).toHaveClass(
        'h-11',
        'fine:h-9',
      );
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
