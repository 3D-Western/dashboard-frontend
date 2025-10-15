import DashboardHeader from '@/components/DashboardHeader';
import { getUser } from '@/lib/auth';
import { UserProvider } from '@/providers/user-provider';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // TODO: Add authentication check here to redirect the user if not authenticated.
  const currentUser = await getUser();

  if (!currentUser) {
    // TODO: redirect to login page
    redirect('/login?error=unauthenticated');
  }

  return (
    <div className="min-h-full">
      <DashboardHeader user={currentUser} />
      <UserProvider user={currentUser}>{children}</UserProvider>
    </div>
  );
}
