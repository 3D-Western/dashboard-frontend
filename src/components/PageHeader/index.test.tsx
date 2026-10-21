import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './index';
import { Routes } from '@/lib/routes';
import { TrainingAdminRoutes } from '@/lib/training-admin-routes';
import { AccessAdminRoutes } from '@/lib/access-admin-routes';

// Mock usePathname from next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from 'next/navigation';
const mockUsePathname = vi.mocked(usePathname);

describe('PageHeader', () => {
  it('renders Dashboard title for dashboard route', () => {
    mockUsePathname.mockReturnValue(Routes.dashboard);
    render(<PageHeader />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders My Jobs title for jobs route', () => {
    mockUsePathname.mockReturnValue(Routes.jobs.home);
    render(<PageHeader />);

    expect(screen.getByText('My Jobs')).toBeInTheDocument();
  });

  it('renders Settings title for settings route', () => {
    mockUsePathname.mockReturnValue(Routes.dashboardUserSettings);
    render(<PageHeader />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders User Management title for admin users route', () => {
    mockUsePathname.mockReturnValue(Routes.adminUsersManagement);
    render(<PageHeader />);

    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('renders Job Management title for admin jobs route', () => {
    mockUsePathname.mockReturnValue(Routes.adminJobsManagement);
    render(<PageHeader />);

    expect(screen.getByText('Job Management')).toBeInTheDocument();
  });

  it('renders Training title for the training route', () => {
    mockUsePathname.mockReturnValue(Routes.training.home);
    render(<PageHeader />);

    expect(screen.getByText('Training')).toBeInTheDocument();
  });

  it('renders a training session under Training', () => {
    mockUsePathname.mockReturnValue(Routes.training.attempt(42));
    render(<PageHeader />);

    expect(screen.getByText('Training Session')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Training' })).toHaveAttribute(
      'href',
      Routes.training.home,
    );
  });

  it('renders the training editor pages under Admin Dashboard', () => {
    mockUsePathname.mockReturnValue(TrainingAdminRoutes.home);
    const { unmount } = render(<PageHeader />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Training Editor');
    expect(screen.getByRole('link', { name: 'Admin Dashboard' })).toHaveAttribute('href', '/admin');
    unmount();

    mockUsePathname.mockReturnValue(TrainingAdminRoutes.import);
    render(<PageHeader />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Import a Training');
  });

  it('names the sign-off queue and a single sign-off, not Dashboard', () => {
    mockUsePathname.mockReturnValue(Routes.adminSignoffs);
    const { unmount } = render(<PageHeader />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Training Sign-offs');
    unmount();

    mockUsePathname.mockReturnValue(Routes.adminSignoff(42));
    render(<PageHeader />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Training Sign-off');
    expect(screen.getByRole('link', { name: 'Training Sign-offs' })).toHaveAttribute(
      'href',
      Routes.adminSignoffs,
    );
  });

  it('names the training audit log, not Edit Training', () => {
    mockUsePathname.mockReturnValue(TrainingAdminRoutes.auditLog);
    render(<PageHeader />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Training Audit Log');
  });

  it('renders a training being edited under the Training Editor', () => {
    mockUsePathname.mockReturnValue(TrainingAdminRoutes.draft(12));
    render(<PageHeader />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Edit Training');
    expect(screen.getByRole('link', { name: 'Training Editor' })).toHaveAttribute(
      'href',
      TrainingAdminRoutes.home,
    );
  });

  it('renders Dashboard as default title for unknown route', () => {
    mockUsePathname.mockReturnValue('/unknown-route');
    render(<PageHeader />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders title as h1 with correct styling', () => {
    mockUsePathname.mockReturnValue(Routes.dashboard);
    render(<PageHeader />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('text-lg', 'font-semibold');
  });

  it('links to the parent page for nested routes', () => {
    mockUsePathname.mockReturnValue(Routes.adminUsersManagement);
    render(<PageHeader />);

    expect(screen.getByRole('link', { name: 'Admin Dashboard' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('User Management');
  });

  it.each([
    [AccessAdminRoutes.home, 'Access System'],
    [AccessAdminRoutes.gatekeepers, 'Gatekeepers'],
    [AccessAdminRoutes.devices, 'Devices'],
    [AccessAdminRoutes.cardLinks, 'Card Links'],
  ])('titles the access page %s as %s', (route, title) => {
    mockUsePathname.mockReturnValue(route);
    render(<PageHeader />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
  });

  it('puts the access sub-pages under Access System', () => {
    mockUsePathname.mockReturnValue(AccessAdminRoutes.devices);
    render(<PageHeader />);

    expect(screen.getByRole('link', { name: 'Access System' })).toHaveAttribute(
      'href',
      AccessAdminRoutes.home,
    );
  });

  it('shows no parent links on top-level pages', () => {
    mockUsePathname.mockReturnValue(Routes.dashboard);
    render(<PageHeader />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('updates title when pathname changes', () => {
    mockUsePathname.mockReturnValue(Routes.dashboard);
    const { rerender } = render(<PageHeader />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    mockUsePathname.mockReturnValue(Routes.jobs.home);
    rerender(<PageHeader />);
    expect(screen.getByText('My Jobs')).toBeInTheDocument();
  });

  it('handles empty pathname', () => {
    mockUsePathname.mockReturnValue('');
    render(<PageHeader />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
