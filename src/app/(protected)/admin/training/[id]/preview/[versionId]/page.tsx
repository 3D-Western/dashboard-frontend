import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TrainingPreview } from '@/components/TrainingAdmin/TrainingPreview';

export const metadata: Metadata = {
  title: 'Preview Training',
  description: 'Walk through a training as a student would, recording nothing',
};

export default async function AdminTrainingPreviewPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;
  const id = Number(versionId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  return <TrainingPreview versionId={id} />;
}
