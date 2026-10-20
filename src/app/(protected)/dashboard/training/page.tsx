import type { Metadata } from 'next';
import { TrainingList } from '@/components/Training/TrainingList';
import { TrainingsProvider } from '@/providers/trainings-provider';

export const metadata: Metadata = {
  title: 'Training',
  description: 'Your 3D Western training and certifications',
};

export default function TrainingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <p className="text-muted-foreground">
        Start with Maker Orientation. Equipment trainings finish with a short in-person sign-off
        from a supervisor.
      </p>
      <TrainingsProvider>
        <TrainingList />
      </TrainingsProvider>
    </div>
  );
}
