'use client';

import { useUser } from '@/providers/user-provider';

export function DashboardGreeting() {
  const user = useUser();

  return (
    <div>
      <h1 className="text-3xl font-bold">{user ? `Hi, ${user.firstName}.` : 'Welcome back.'}</h1>
      <p className="mt-2 text-muted-foreground">
        Here&apos;s where your prints and training stand.
      </p>
    </div>
  );
}
