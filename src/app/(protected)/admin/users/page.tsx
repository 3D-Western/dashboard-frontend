import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

export default async function UserManagementPage() {
  return (
    <div className="container space-y-6 p-6">
      <div className="mb-4 flex items-center gap-2 text-muted-foreground">
        <Users className="h-5 w-5" />
        <span className="text-sm">Manage user accounts and permissions</span>
      </div>

      <div className="space-y-4 rounded-lg border p-8 text-center">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">User Management</h2>
          <p className="text-muted-foreground">
            User management features will be implemented here. This will include user listing, role
            management, and access control.
          </p>
        </div>
        <Button disabled>Coming Soon</Button>
      </div>
    </div>
  );
}
