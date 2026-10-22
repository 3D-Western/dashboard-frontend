import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TrainingReview } from '@/components/Training/TrainingReview';

export const metadata: Metadata = {
  title: 'Review the material',
  description: 'Look back over a training you have not passed yet',
};

export default async function TrainingReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { attemptId } = await params;
  const { step } = await searchParams;
  const id = Number(attemptId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const stepId = Number(step);

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 xl:max-w-5xl short:py-2">
      <TrainingReview
        attemptId={id}
        initialStepId={Number.isInteger(stepId) && stepId > 0 ? stepId : null}
      />
    </div>
  );
}
