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
    <PageContainer narrow className="py-8 pr-11 pl-6 md:px-6">
      <PageTitle
        title="Create 3D Print Job"
        description="Upload your 3D model first. We start checking it right away, while you tell us about it."
      />

      <PrintSubmissionGate mockMode={mockMode} />
    </PageContainer>
  );
}
