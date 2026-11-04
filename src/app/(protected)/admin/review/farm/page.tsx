import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import PageTitle from '@/components/PageTitle';
import { FarmDesk } from '@/components/PipelineReview/FarmDesk';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { validateSession } from '@/lib/auth';
import { canReviewPrints } from '@/lib/pipeline-review';
import { Routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Print Farm',
  description: 'Held farm jobs and quarantined printers',
};

export default async function PrintFarmPage() {
  const user = await validateSession();
  if (!canReviewPrints(user)) return <UnauthorizedPage title="Print Farm" />;

  return (
    <PageContainer className="space-y-6 p-4 sm:p-6">
      <PageTitle
        title="Print Farm"
        description="Jobs the farm held for a person, and printers it took out of rotation. Each action needs a reason."
      />
      <FarmDesk />
      <p className="text-xs text-muted-foreground">
        <Link
          href={Routes.adminReview}
          className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3" aria-hidden="true" />
          Back to Print Review
        </Link>
      </p>
    </PageContainer>
  );
}
