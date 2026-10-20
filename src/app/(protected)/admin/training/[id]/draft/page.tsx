import type { Metadata } from 'next';
import { DraftEditor } from '@/components/TrainingAdmin/DraftEditor';

export const metadata: Metadata = {
  title: 'Edit Draft',
  description: 'Edit the draft of a training and publish it',
};

export default function AdminTrainingDraftPage() {
  return <DraftEditor />;
}
