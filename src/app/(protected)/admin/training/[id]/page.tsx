import type { Metadata } from 'next';
import { AuthorOnly } from '@/components/TrainingAdmin/AuthorOnly';
import { TrainingOverview } from '@/components/TrainingAdmin/TrainingOverview';

export const metadata: Metadata = {
  title: 'Edit Training',
  description: 'A training and its versions',
};

export default function AdminTrainingOverviewPage() {
  return (
    <AuthorOnly>
      <TrainingOverview />
    </AuthorOnly>
  );
}
