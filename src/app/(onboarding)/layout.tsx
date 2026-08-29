import { validateSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

// Disable static optimization to check auth status on each request
export const dynamic = 'force-dynamic';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await validateSession();

  // Must be logged in to reach onboarding — deliberately does NOT check onboarding-completed
  // status here (unlike (protected)/layout.tsx), since that check is what redirects TO this
  // route in the first place. Checking it here would create a redirect loop.
  if (!currentUser) {
    redirect('/login?error=unauthenticated');
  }

  return <div className="min-h-svh bg-muted">{children}</div>;
}
