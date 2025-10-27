import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export default async function PrintManagementPage() {
  return (
    <div className="container space-y-6 p-6">
      <div className="mb-4 flex items-center gap-2 text-muted-foreground">
        <Settings className="h-5 w-5" />
        <span className="text-sm">Manage print jobs, queues, and printer settings</span>
      </div>

      <div className="space-y-4 rounded-lg border p-8 text-center">
        <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
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
