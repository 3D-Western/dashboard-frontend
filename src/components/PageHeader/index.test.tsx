import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './index';
import { Routes } from '@/lib/routes';

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

  it('renders My Orders title for orders route', () => {
    mockUsePathname.mockReturnValue(Routes.orders.home);
    render(<PageHeader />);

    expect(screen.getByText('My Orders')).toBeInTheDocument();
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

  it('renders Order Management title for admin orders route', () => {
    mockUsePathname.mockReturnValue(Routes.adminOrdersManagement);
    render(<PageHeader />);

    expect(screen.getByText('Order Management')).toBeInTheDocument();
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

  it('renders container with correct styling', () => {
    mockUsePathname.mockReturnValue(Routes.dashboard);
    const { container } = render(<PageHeader />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'items-center', 'gap-2');
  });

  it('updates title when pathname changes', () => {
    mockUsePathname.mockReturnValue(Routes.dashboard);
    const { rerender } = render(<PageHeader />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    mockUsePathname.mockReturnValue(Routes.orders.home);
    rerender(<PageHeader />);
    expect(screen.getByText('My Orders')).toBeInTheDocument();
  });

  it('handles empty pathname', () => {
    mockUsePathname.mockReturnValue('');
    render(<PageHeader />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
