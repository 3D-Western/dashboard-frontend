import type { Metadata } from 'next';
import LaserCuttingOrderForm from './components/LaserCuttingOrderForm';
import PageTitle from '@/components/PageTitle';

export const metadata: Metadata = {
  title: 'New Laser Cutting Order',
  description: 'Create a new laser cutting order',
};

export default function NewLaserCuttingOrderPage() {
  return (
    <div className="px-6 py-8">
      <PageTitle
        title="Create Laser Cutting Order"
        description="Upload your 2D design files and specify cutting requirements"
      />

      <LaserCuttingOrderForm />
    </div>
  );
}
