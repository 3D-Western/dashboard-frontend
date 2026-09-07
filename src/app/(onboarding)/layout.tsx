import { redirect } from 'next/navigation';

// TEMP: onboarding is out of scope until the backend implements it — see docs/LAUNCH_SCOPE.md
// and the matching toggle in src/app/(protected)/layout.tsx. Restore the original
// validateSession()-gated body from git history when it's ready to ship.
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  redirect('/dashboard');
  return children;
}
