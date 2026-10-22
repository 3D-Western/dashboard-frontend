import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserManagementTabs } from './UserManagementTabs';

describe('UserManagementTabs', () => {
  it('marks the active tab and links the other one', () => {
    render(<UserManagementTabs active="invitations" showInvitations />);

    expect(screen.getByRole('tab', { name: 'Invitations' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const users = screen.getByRole('tab', { name: 'Users' });
    expect(users).toHaveAttribute('aria-selected', 'false');
    expect(users).toHaveAttribute('href', '/admin/users');
  });

  it('shows nothing when the person cannot see invitations', () => {
    render(<UserManagementTabs active="users" showInvitations={false} />);

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
