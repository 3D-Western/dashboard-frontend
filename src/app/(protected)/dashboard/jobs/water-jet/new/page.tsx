import type { Metadata } from 'next';
import WaterJetForm from './components/WaterJetForm';
import PageTitle from '@/components/PageTitle';

export const metadata: Metadata = {
  title: 'New Water Jet Cutting Job',
  description: 'Create a new water jet cutting job',
};

export default function NewWaterJetJobPage() {
  const mockMode = process.env.MOCK_ENABLED === 'true';

  return (
    <div className="px-6 py-8">
      <PageTitle
        title="Create Water Jet Cutting Job"
        description="Upload your design files and specify cutting requirements"
      />

      <WaterJetForm mockMode={mockMode} />
    </div>
  );
}
