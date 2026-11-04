import type { Metadata } from 'next';
import { PageContainer } from '@/components/PageContainer';
import PageTitle from '@/components/PageTitle';
import { AlertsCentre } from '@/components/StaffAlerts/AlertsCentre';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { validateSession } from '@/lib/auth';
import { canReviewPrints } from '@/lib/pipeline-review';

export const metadata: Metadata = {
  title: 'Alerts',
  description: 'Holds, escalations and pipeline problems that need a person',
};

export default async function AlertsPage() {
  const user = await validateSession();
  if (!canReviewPrints(user)) return <UnauthorizedPage title="Alerts" />;

  return (
    <PageContainer className="space-y-6 p-4 sm:p-6">
      <PageTitle
        title="Alerts"
        description="What needs a person: held and escalated prints and pipeline problems. Open an alert to deal with it, acknowledge it when you are on it, resolve it with a note when done. Alerts also close themselves when the cause clears."
      />
      <AlertsCentre />
    </PageContainer>
  );
}
