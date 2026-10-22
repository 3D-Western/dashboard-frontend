import type { Metadata } from 'next';
import { QuestionReport } from '@/components/TrainingAdmin/QuestionReport';

export const metadata: Metadata = {
  title: 'Question Report',
  description: 'How members answered each question, and corrections',
};

export default function AdminTrainingReportPage() {
  return <QuestionReport />;
}
