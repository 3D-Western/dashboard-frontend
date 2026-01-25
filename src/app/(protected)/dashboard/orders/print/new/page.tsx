import type { Metadata } from 'next';
import PrintOrderForm from './components/PrintOrderForm';
import PageTitle from '@/components/PageTitle';

export const metadata: Metadata = {
  title: 'New 3D Print Order',
  description: 'Create a new 3D printing order',
};

export default function NewPrintOrderPage() {
  return (
    <div className="px-6 py-8">
      <PageTitle
        title="Create 3D Print Order"
        description="Upload your 3D model and specify your printing requirements"
      />

      <PrintOrderForm />
    </div>
  );
}
