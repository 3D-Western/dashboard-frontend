import type { Metadata } from 'next';
import { PrintSubmissionGate } from './components/PrintSubmissionGate';
import PageTitle from '@/components/PageTitle';
import { PageContainer } from '@/components/PageContainer';

export const metadata: Metadata = {
  title: 'New 3D Print Job',
  description: 'Create a new 3D printing job',
};

export default function NewPrintJobPage() {
  const mockMode = process.env.MOCK_ENABLED === 'true';

  return (
    <PageContainer className="px-6 py-8">
      <PageTitle
        title="Create 3D Print Job"
        description="Upload your 3D model and specify your printing requirements"
      />

      <PrintSubmissionGate mockMode={mockMode} />
    </PageContainer>
  );
}
