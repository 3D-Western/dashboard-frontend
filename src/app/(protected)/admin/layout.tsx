import { validateSession } from '@/lib/auth';
import { isAdmin } from '@/types/user';
import { redirect } from 'next/navigation';

// Force dynamic rendering for admin routes
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await validateSession();

  // Check if user is authenticated (should already be handled by parent layout)
  if (!currentUser) {
    redirect('/login?error=unauthenticated');
  }

  // Check if user is in the super_admins group
  if (!isAdmin(currentUser)) {
    redirect('/dashboard?error=unauthorized');
  }

  return <>{children}</>;
}
