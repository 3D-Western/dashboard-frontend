import type { Metadata } from 'next';
import { AuthorOnly } from '@/components/TrainingAdmin/AuthorOnly';
import { TrainingSettingsPage } from '@/components/TrainingAdmin/TrainingSettingsForm';

export const metadata: Metadata = {
  title: 'Training Settings',
  description: 'Pass mark, refresher and add-on settings for a training',
};

export default function AdminTrainingSettingsPage() {
  return (
    <AuthorOnly>
      <TrainingSettingsPage />
    </AuthorOnly>
  );
}
