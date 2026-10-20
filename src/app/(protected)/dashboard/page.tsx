import type { Metadata } from 'next';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import DashboardStats from '@/components/DashboardStats';
import { DashboardGreeting } from './components/DashboardGreeting';
import { DashboardSection } from './components/DashboardSection';
import { QuickActions } from './components/QuickActions';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your 3D Western dashboard overview',
};

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  unauthorized: {
    title: 'Access Denied',
    description: 'You do not have permission to access that page. Admin access is required.',
  },
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      {error && ERROR_MESSAGES[error] && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{ERROR_MESSAGES[error].title}</AlertTitle>
          <AlertDescription>{ERROR_MESSAGES[error].description}</AlertDescription>
        </Alert>
      )}

      <DashboardGreeting />

      <DashboardSection id="prints" title="Your prints">
        <DashboardStats />
      </DashboardSection>
      <DashboardSection id="quick-actions" title="Quick actions">
        <QuickActions />
      </DashboardSection>
    </div>
  );
}
