import type { Metadata } from 'next';
import LaserCuttingOrderForm from './components/LaserCuttingOrderForm';

export const metadata: Metadata = {
  title: 'New Laser Cutting Order',
  description: 'Create a new laser cutting order',
};

export default function NewLaserCuttingOrderPage() {
  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Create Laser Cutting Order</h1>
        <p className="text-muted-foreground">
          Upload your 2D design files and specify cutting requirements
        </p>
      </div>

      <LaserCuttingOrderForm />
    </div>
  );
}
