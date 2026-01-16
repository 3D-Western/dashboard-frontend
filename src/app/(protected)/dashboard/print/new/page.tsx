import type { Metadata } from 'next';
import NewPrintForm from '@/components/PrintRequestForm/NewPrintForm';

export const metadata: Metadata = {
  title: 'New Print Job',
  description: 'Submit a new 3D print request',
};

export default function NewPrintPage() {
  return (
    <div className="container p-6">
      <div className="mt-6">
        <NewPrintForm />
      </div>
    </div>
  );
}
