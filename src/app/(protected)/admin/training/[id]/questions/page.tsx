import type { Metadata } from 'next';
import { AuthorOnly } from '@/components/TrainingAdmin/AuthorOnly';
import { QuestionsManager } from '@/components/TrainingAdmin/QuestionsManager';

export const metadata: Metadata = {
  title: 'Training Questions',
  description: 'Topics and questions of a training',
};

export default function AdminTrainingQuestionsPage() {
  return (
    <AuthorOnly>
      <QuestionsManager />
    </AuthorOnly>
  );
}
