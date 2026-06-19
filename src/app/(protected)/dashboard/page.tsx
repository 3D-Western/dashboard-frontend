import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Printer, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import PageTitle from '@/components/PageTitle';
import { Routes } from '@/lib/routes';
import DashboardStats from '@/components/DashboardStats';

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
    <div className="container space-y-6 p-6">
      {/* Error Alert */}
      {error && ERROR_MESSAGES[error] && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{ERROR_MESSAGES[error].title}</AlertTitle>
          <AlertDescription>{ERROR_MESSAGES[error].description}</AlertDescription>
        </Alert>
      )}

      <PageTitle title="Dashboard" description="Welcome to Western 3D Print Club Dashboard" />

      {/* Dashboard Stats*/}
      <DashboardStats />

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="flex gap-4">
          <Button asChild>
            <Link href={Routes.jobs.home}>
              <Printer className="mr-2 h-4 w-4" />
              View All Jobs
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
