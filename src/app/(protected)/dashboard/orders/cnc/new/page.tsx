import type { Metadata } from 'next';
import CNCOrderForm from './components/CNCOrderForm';

export const metadata: Metadata = {
  title: 'New CNC Order',
  description: 'Create a new CNC machining order',
};

export default function NewCNCOrderPage() {
  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Create CNC Machining Order</h1>
        <p className="text-muted-foreground">
          Upload your design files and specify machining requirements
        </p>
      </div>

      <CNCOrderForm />
    </div>
  );
}
