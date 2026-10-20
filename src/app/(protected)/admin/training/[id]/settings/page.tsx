import type { Metadata } from 'next';
import { TrainingSettingsPage } from '@/components/TrainingAdmin/TrainingSettingsForm';

export const metadata: Metadata = {
  title: 'Training Settings',
  description: 'Pass mark, refresher and add-on settings for a training',
};

export default function AdminTrainingSettingsPage() {
  return <TrainingSettingsPage />;
}
