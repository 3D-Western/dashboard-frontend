import type { Metadata } from 'next';
import CNCOrderForm from './components/CNCOrderForm';
import PageTitle from '@/components/PageTitle';

export const metadata: Metadata = {
  title: 'New CNC Order',
  description: 'Create a new CNC machining order',
};

export default function NewCNCOrderPage() {
  return (
    <div className="px-6 py-8">
      <PageTitle
        title="Create CNC Machining Order"
        description="Upload your design files and specify machining requirements"
      />

      <CNCOrderForm />
    </div>
  );
}
