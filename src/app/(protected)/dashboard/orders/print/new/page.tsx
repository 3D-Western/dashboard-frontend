import type { Metadata } from 'next';
import PrintOrderForm from './components/PrintOrderForm';

export const metadata: Metadata = {
  title: 'New 3D Print Order',
  description: 'Create a new 3D printing order',
};

export default function NewPrintOrderPage() {
  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Create 3D Print Order</h1>
        <p className="text-muted-foreground">
          Upload your 3D model and specify your printing requirements
        </p>
      </div>

      <PrintOrderForm />
    </div>
  );
}
