import { notFound } from 'next/navigation';
import { TrainingProvider } from '@/components/TrainingAdmin/TrainingContext';

export default async function AdminTrainingDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trainingId = Number(id);
  if (!Number.isInteger(trainingId) || trainingId <= 0) notFound();

  return <TrainingProvider trainingId={trainingId}>{children}</TrainingProvider>;
}
