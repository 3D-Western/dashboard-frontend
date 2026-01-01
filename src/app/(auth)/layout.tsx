import { validateSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

// Disable static optimization to check auth status on each request
export const dynamic = 'force-dynamic';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await validateSession();

  // If user is already authenticated, redirect to dashboard
  if (currentUser) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
