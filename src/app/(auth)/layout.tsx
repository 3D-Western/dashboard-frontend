import { validateSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

// Disable static optimization to check auth status on each request
export const dynamic = 'force-dynamic';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await validateSession();

  // If user is already authenticated, redirect to dashboard
  if (currentUser) {
    redirect('/dashboard');
  }

  return (
    <div className="relative min-h-svh bg-muted">
      {/* Theme Toggle - Top Right Corner */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
