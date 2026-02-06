import type { Metadata } from 'next';
import WaterJetForm from './components/WaterJetForm';
import PageTitle from '@/components/PageTitle';

export const metadata: Metadata = {
  title: 'New Water Jet Cutting Order',
  description: 'Create a new water jet cutting order',
};

export default function NewWaterJetOrderPage() {
  return (
    <div className="px-6 py-8">
      <PageTitle
        title="Create Water Jet Cutting Order"
        description="Upload your design files and specify cutting requirements"
      />

      <WaterJetForm />
    </div>
  );
}
