import type { Metadata } from 'next';
import { PageContainer } from '@/components/PageContainer';
import PageTitle from '@/components/PageTitle';
import { ReviewQueue } from '@/components/PipelineReview/ReviewQueue';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { validateSession } from '@/lib/auth';
import { canReviewPrints } from '@/lib/pipeline-review';

export const metadata: Metadata = {
  title: 'Print Review',
  description: 'Jobs and problem reports that need a person',
};

export default async function PrintReviewPage() {
  const user = await validateSession();
  if (!canReviewPrints(user)) return <UnauthorizedPage title="Print Review" />;

  return (
    <PageContainer className="space-y-6 p-4 sm:p-6">
      <PageTitle
        title="Print Review"
        description="Jobs the screening held or sent to a person, and the problems students reported. Oldest first."
      />
      <ReviewQueue />
    </PageContainer>
  );
}
