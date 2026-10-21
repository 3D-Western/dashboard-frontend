import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TrainingPlayer } from '@/components/Training/TrainingPlayer';

export const metadata: Metadata = {
  title: 'Training',
  description: 'Work through a training',
};

export default async function TrainingAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const id = Number(attemptId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 xl:max-w-5xl">
      <TrainingPlayer attemptId={id} />
    </div>
  );
}
