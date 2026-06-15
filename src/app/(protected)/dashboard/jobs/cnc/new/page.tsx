import type { Metadata } from 'next';
import CNCJobForm from './components/CNCJobForm';
import PageTitle from '@/components/PageTitle';

export const metadata: Metadata = {
  title: 'New CNC Job',
  description: 'Create a new CNC machining job',
};

export default function NewCNCJobPage() {
  return (
    <div className="px-6 py-8">
      <PageTitle
        title="Create CNC Machining Job"
        description="Upload your design files and specify machining requirements"
      />

      <CNCJobForm />
    </div>
  );
}
