import type { Metadata } from 'next';
import { TrainingsList } from '@/components/TrainingAdmin/TrainingsList';

export const metadata: Metadata = {
  title: 'Training Editor',
  description: 'Create, edit and publish trainings',
};

export default function AdminTrainingPage() {
  return <TrainingsList />;
}
