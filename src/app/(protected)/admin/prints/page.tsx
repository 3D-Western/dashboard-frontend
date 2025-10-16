import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function PrintManagementPage() {
  const user = await getUser();

  if (!user || user.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }
  return (
    <div className="container p-6 space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <Settings className="h-5 w-5" />
        <span className="text-sm">Manage print jobs, queues, and printer settings</span>
      </div>

      <div className="rounded-lg border p-8 text-center space-y-4">
        <Settings className="h-12 w-12 mx-auto text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Print Management</h2>
          <p className="text-muted-foreground">
            Print management features will be implemented here. This will include managing all print
            jobs, printer configurations, and queue management.
          </p>
        </div>
        <Button disabled>Coming Soon</Button>
      </div>
    </div>
  );
}
