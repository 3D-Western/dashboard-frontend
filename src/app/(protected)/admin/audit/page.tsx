import type { Metadata } from 'next';
import { ClipboardList } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { validateSession } from '@/lib/auth';
import { hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import UnauthorizedPage from '@/components/UnauthorizedPage';

export const metadata: Metadata = {
  title: 'Audit Log',
  description: 'View system audit logs and activity history',
};

export default async function AuditLogPage() {
  const user = await validateSession();
  if (!user || !hasPermission(user, PERMISSIONS.AUDIT_READ)) return <UnauthorizedPage title="Audit Log" />;

  return (
    <div className="container space-y-6 p-6">
      <PageTitle title="Audit Log" description="View system audit logs and activity history" />

      <div className="space-y-4 rounded-lg border p-8 text-center">
        <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Audit Log</h2>
          <p className="text-muted-foreground">
            Audit log features will be implemented here. This will include a searchable history of
            all system actions, user activity, and administrative changes.
          </p>
        </div>
      </div>
    </div>
  );
}
