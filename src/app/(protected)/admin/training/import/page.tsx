import type { Metadata } from 'next';
import { AuthorOnly } from '@/components/TrainingAdmin/AuthorOnly';
import { ImportScreen } from '@/components/TrainingAdmin/ImportScreen';

export const metadata: Metadata = {
  title: 'Import a Training',
  description: 'Import a training from a YAML file',
};

export default function AdminTrainingImportPage() {
  return (
    <AuthorOnly>
      <ImportScreen />
    </AuthorOnly>
  );
}
