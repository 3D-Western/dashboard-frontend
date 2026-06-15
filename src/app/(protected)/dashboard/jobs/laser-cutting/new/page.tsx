import type { Metadata } from 'next';
import LaserCuttingJobForm from './components/LaserCuttingJobForm';
import PageTitle from '@/components/PageTitle';

export const metadata: Metadata = {
  title: 'New Laser Cutting Job',
  description: 'Create a new laser cutting job',
};

export default function NewLaserCuttingJobPage() {
  return (
    <div className="px-6 py-8">
      <PageTitle
        title="Create Laser Cutting Job"
        description="Upload your 2D design files and specify cutting requirements"
      />

      <LaserCuttingJobForm />
    </div>
  );
}
