import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { UserProvider, useUser } from '@/providers/user-provider';
import { createMockUser, createMockAdmin } from '@test/utils/mockFactories';
import { User } from '@/types/user';

// Test component that uses useUser hook
function TestComponent() {
  const user = useUser();
  return (
    <div>
      {user ? (
        <div>
          <p data-testid="user-name">
            {user.firstName} {user.lastName}
          </p>
          <p data-testid="user-email">{user.email}</p>
          <p data-testid="user-groups">{user.groups.map((g) => g.groupKey).join(',')}</p>
        </div>
      ) : (
        <p data-testid="no-user">No user</p>
      )}
    </div>
  );
}

// Component to test multiple consumers
function MultipleConsumers() {
  return (
    <div>
      <FirstConsumer />
      <SecondConsumer />
    </div>
  );
}

function FirstConsumer() {
  const user = useUser();
  return <div data-testid="first-consumer">{user?.firstName || 'No user'}</div>;
}

function SecondConsumer() {
  const user = useUser();
  return <div data-testid="second-consumer">{user?.email || 'No user'}</div>;
}

describe('UserProvider Integration', () => {
  it('provides null when no user is authenticated', () => {
    render(
      <UserProvider user={null}>
        <TestComponent />
      </UserProvider>,
    );

    expect(screen.getByTestId('no-user')).toBeInTheDocument();
  });

  it('provides user data when user is authenticated', () => {
    const mockUser = createMockUser({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    });

    render(
      <UserProvider user={mockUser}>
        <TestComponent />
      </UserProvider>,
    );

    expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
    expect(screen.getByTestId('user-email')).toHaveTextContent('john.doe@example.com');
    expect(screen.getByTestId('user-groups')).toHaveTextContent('members');
  });

  it('provides consistent null value across re-renders when no user', () => {
    const { rerender } = render(
      <UserProvider user={null}>
        <TestComponent />
      </UserProvider>,
    );

    expect(screen.getByTestId('no-user')).toBeInTheDocument();

    // Re-render with same null user
    rerender(
      <UserProvider user={null}>
        <TestComponent />
      </UserProvider>,
    );

    // Should still show no user
    expect(screen.getByTestId('no-user')).toBeInTheDocument();
  });

  it('updates propagate to all consumers', () => {
    const mockUser = createMockUser({
      firstName: 'Jane',
      email: 'jane@example.com',
    });

    render(
      <UserProvider user={mockUser}>
        <MultipleConsumers />
      </UserProvider>,
    );

    expect(screen.getByTestId('first-consumer')).toHaveTextContent('Jane');
    expect(screen.getByTestId('second-consumer')).toHaveTextContent('jane@example.com');
  });

  it('provides same user instance to multiple consumers', () => {
    const mockUser = createMockUser();

    const user1Ref = { current: null as User | null };
    const user2Ref = { current: null as User | null };

    function Consumer1() {
      const user = useUser();
      useEffect(() => {
        user1Ref.current = user;
      }, [user]);
      return null;
    }

    function Consumer2() {
      const user = useUser();
      useEffect(() => {
        user2Ref.current = user;
      }, [user]);
      return null;
    }

    render(
      <UserProvider user={mockUser}>
        <Consumer1 />
        <Consumer2 />
      </UserProvider>,
    );

    expect(user1Ref.current).toBe(user2Ref.current);
    expect(user1Ref.current).toEqual(mockUser);
  });

  it('handles admin user correctly', () => {
    const adminUser = createMockAdmin({
      firstName: 'Admin',
      lastName: 'User',
      experienceLevel: 'advanced',
    });

    render(
      <UserProvider user={adminUser}>
        <TestComponent />
      </UserProvider>,
    );

    expect(screen.getByTestId('user-name')).toHaveTextContent('Admin User');
    expect(screen.getByTestId('user-groups')).toHaveTextContent('super_admins');
  });

  it('handles user with different experience levels', () => {
    const beginnerUser = createMockUser({
      experienceLevel: 'beginner',
    });

    const advancedUser = createMockUser({
      experienceLevel: 'advanced',
    });

    const { rerender } = render(
      <UserProvider user={beginnerUser}>
        <TestComponent />
      </UserProvider>,
    );

    expect(screen.getByTestId('user-name')).toBeInTheDocument();

    rerender(
      <UserProvider user={advancedUser}>
        <TestComponent />
      </UserProvider>,
    );

    expect(screen.getByTestId('user-name')).toBeInTheDocument();
  });
});
