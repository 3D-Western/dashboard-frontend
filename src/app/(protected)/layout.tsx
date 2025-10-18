import { AppSidebar } from '@/components/AppSidebar';
import { PageHeader } from '@/components/PageHeader';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
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
    <SidebarProvider>
      <AppSidebar user={currentUser} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <PageHeader />
        </header>
        <div className="flex-1">
          <UserProvider user={currentUser}>{children}</UserProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
