import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@test/utils/render';
import { createMockUser, perm } from '@test/utils/mockFactories';
import { AccessAdminShell } from './AccessAdminShell';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin/access/devices'),
  useRouter: () => ({ push: vi.fn() }),
}));

const renderShell = (permissions: string[]) =>
  render(
    <AccessAdminShell>
      <p>Access content</p>
    </AccessAdminShell>,
    { user: createMockUser({ permissions: permissions.map((key) => perm(key)) }) },
  );

describe('AccessAdminShell permission-based visibility', () => {
  it('shows the pages and their links to someone with access:admin', () => {
    renderShell(['access:admin']);

    expect(screen.getByText('Access content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Live' })).toHaveAttribute('href', '/admin/access');
    expect(screen.getByRole('link', { name: 'Devices' })).toHaveAttribute(
      'href',
      '/admin/access/devices',
    );
    expect(screen.getByRole('link', { name: 'Gatekeepers' })).toHaveAttribute(
      'href',
      '/admin/access/gatekeepers',
    );
    expect(screen.getByRole('link', { name: 'Card links' })).toHaveAttribute(
      'href',
      '/admin/access/card-links',
    );
    expect(screen.getByRole('link', { name: 'Devices' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Live' })).not.toHaveAttribute('aria-current');
  });

  it('makes the section pills 44 px tall on touch screens in one scrolling row', () => {
    renderShell(['access:admin']);

    const nav = screen.getByRole('navigation', { name: 'Access system sections' });
    expect(nav).toHaveClass('flex-nowrap', 'overflow-x-auto', 'md:flex-wrap');
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveClass('min-h-11', 'fine:min-h-0', 'shrink-0');
    }
  });

  it('denies access to other admins, including training editors and sign-off supervisors', () => {
    renderShell(['training:author', 'training:signoff', 'users:list']);

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText('Access content')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('denies access to a signed-out visitor', () => {
    render(
      <AccessAdminShell>
        <p>Access content</p>
      </AccessAdminShell>,
      { user: null },
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
