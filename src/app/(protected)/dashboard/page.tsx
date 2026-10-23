import type { Metadata } from 'next';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import DashboardStats from '@/components/DashboardStats';
import { PageContainer } from '@/components/PageContainer';
import { DashboardGreeting } from './components/DashboardGreeting';
import { DashboardSection } from './components/DashboardSection';
// TEMP: print jobs aren't supported at launch — see docs/LAUNCH_SCOPE.md.
// import { QuickActions } from './components/QuickActions';
import { TrainingSummary } from './components/TrainingSummary';
import { OrientationInstallPrompt } from '@/components/InstallPrompt/OrientationInstallPrompt';
import { OrientationPrompt } from '@/components/Training/OrientationPrompt';
import { TrainingsProvider } from '@/providers/trainings-provider';

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
    <PageContainer className="space-y-6 p-6">
      {error && ERROR_MESSAGES[error] && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{ERROR_MESSAGES[error].title}</AlertTitle>
          <AlertDescription>{ERROR_MESSAGES[error].description}</AlertDescription>
        </Alert>
      )}

      <DashboardGreeting />

      <TrainingsProvider>
        {/* Until orientation is done this leads there first, on every screen size */}
        <OrientationPrompt />
        {/* After orientation is passed: offer to add the app to the home screen (phones only) */}
        <OrientationInstallPrompt />

        {/* Two columns from xl (prints + actions | training), stacked below. The sidebar takes 256 px
            of a 1024 px screen, so lg would leave the training card too narrow. min-w-0 keeps a
            grid item from growing past the page. */}
        <div className="grid items-start gap-6 xl:grid-cols-3">
          <div className="min-w-0 space-y-6 xl:col-span-2">
            <DashboardSection id="prints" title="Your prints">
              <DashboardStats />
            </DashboardSection>
            {/* TEMP: print jobs aren't supported at launch — see docs/LAUNCH_SCOPE.md.
            <DashboardSection id="quick-actions" title="Quick actions">
              <QuickActions />
            </DashboardSection>
            */}
          </div>
          <TrainingSummary className="min-w-0" />
        </div>
      </TrainingsProvider>
    </PageContainer>
  );
}
