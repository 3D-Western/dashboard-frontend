import type { Metadata } from 'next';
import { TrainingOverview } from '@/components/TrainingAdmin/TrainingOverview';

export const metadata: Metadata = {
  title: 'Edit Training',
  description: 'A training and its versions',
};

export default function AdminTrainingOverviewPage() {
  return <TrainingOverview />;
}
