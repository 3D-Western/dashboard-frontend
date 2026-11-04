import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/PageContainer';
import { ReviewJobView } from '@/components/PipelineReview/ReviewJobView';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { validateSession } from '@/lib/auth';
import { canReviewPrints } from '@/lib/pipeline-review';

export const metadata: Metadata = {
  title: 'Review a print',
  description: 'Findings, plan and decisions for one job',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReviewJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const user = await validateSession();
  if (!canReviewPrints(user)) return <UnauthorizedPage title="Print Review" />;

  const { jobId } = await params;
  if (!UUID.test(jobId)) notFound();

  return (
    <PageContainer className="space-y-6 p-4 sm:p-6">
      <ReviewJobView jobId={jobId} />
    </PageContainer>
  );
}
