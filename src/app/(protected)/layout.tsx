import { AgreementsGate } from '@/components/Agreements/AgreementsGate';
import { AppSidebar } from '@/components/AppSidebar';
import { loadPendingAgreements } from '@/lib/agreements';
import { PageHeader } from '@/components/PageHeader';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { validateSession } from '@/lib/auth';
import { isBackendUnavailableError } from '@/api/client/errors';
import { onboardingAPI } from '@/api/client/onboarding';
import { Routes } from '@/lib/routes';
import { UserProvider } from '@/providers/user-provider';
import { redirect } from 'next/navigation';
import type { User } from '@/types/user';

// Disable entire protected layout from being statically optimized. Since it will always
// need to validate the user session on each request.
export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // The agreements check runs alongside the session check (it needs the same cookies), so it adds
  // no extra wait. It never throws: see loadPendingAgreements.
  const pendingAgreementsPromise = loadPendingAgreements();

  let currentUser: User | null;
  try {
    currentUser = await validateSession();
  } catch (error) {
    // Backend down: nothing is known about the session, so keep the cookies and show the error page
    if (isBackendUnavailableError(error)) throw error;
    // The backend rejected this session some other way (user deleted, account locked, ...). Drop the
    // cookies, or every page load would fail on them again.
    console.error('[auth] The backend rejected this session; clearing its cookies.', error);
    redirect(Routes.sessionReset);
  }

  const pendingAgreements = await pendingAgreementsPromise;

  if (!currentUser) {
    redirect('/login?error=unauthenticated');
  }

  // TEMP: onboarding is out of scope until the backend implements it — see docs/LAUNCH_SCOPE.md.
  // Flip to true (and delete the if-wrapper, leaving the two inner lines unconditional) once
  // GET /api/v1/users/me/onboarding is real.
  const ONBOARDING_CHECK_ENABLED = false;

  if (ONBOARDING_CHECK_ENABLED) {
    const { onboardingCompleted } = await onboardingAPI.getStatus();
    if (!onboardingCompleted) {
      redirect(Routes.onboarding);
    }
  }

  // Agreements (terms, waiver, ...) must be accepted before anything else in the dashboard.
  if (pendingAgreements.length > 0) {
    return <AgreementsGate agreements={pendingAgreements} />;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={currentUser} />
      {/* min-w-0 lets wide tables scroll inside their own box instead of widening the page */}
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 short:h-12">
          <SidebarTrigger className="-ml-1 size-11 fine:size-7" />
          <PageHeader />
        </header>
        <div className="flex-1">
          <UserProvider user={currentUser}>{children}</UserProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
