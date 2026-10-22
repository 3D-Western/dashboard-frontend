import { validateSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

// Disable static optimization to check auth status on each request
export const dynamic = 'force-dynamic';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // FAILS OPEN: these pages are how a member gets a working session back, so they must render even
  // when the session check breaks (a stale cookie the backend rejects, the backend being down, ...).
  const currentUser = await validateSession().catch((error: unknown) => {
    console.error('[auth] Could not check the session; showing the page as logged out.', error);
    return null;
  });

  // If user is already authenticated, redirect to dashboard
  if (currentUser) {
    redirect('/dashboard');
  }

  return (
    <div className="relative min-h-svh bg-background">
      {/* Theme Toggle - Top Right Corner */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      {/* Each page leaves room for the toggle on phones (pt-16) and sizes itself to the screen. */}
      {children}
    </div>
  );
}
