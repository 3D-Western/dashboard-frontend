import type { Metadata } from 'next';
import { AuthorOnly } from '@/components/TrainingAdmin/AuthorOnly';
import { TrainingsList } from '@/components/TrainingAdmin/TrainingsList';

export const metadata: Metadata = {
  title: 'Training Editor',
  description: 'Create, edit and publish trainings',
};

export default function AdminTrainingPage() {
  return (
    <AuthorOnly>
      <TrainingsList />
    </AuthorOnly>
  );
}
