import type { Metadata } from 'next';
import WaterJetForm from './components/WaterJetForm';

export const metadata: Metadata = {
  title: 'New Water Jet Cutting Order',
  description: 'Create a new water jet cutting order',
};

export default function NewWaterJetOrderPage() {
  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Create Water Jet Cutting Order</h1>
        <p className="text-muted-foreground">
          Upload your design files and specify cutting requirements
        </p>
      </div>

      <WaterJetForm />
    </div>
  );
}
