import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Printer, LayoutDashboard, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

      {/* Welcome Section */}
      <div className="space-y-2">
        <p className="text-muted-foreground">Welcome to Western 3D Print Club Dashboard</p>
      </div>

      {/* Quick Stats - Placeholder for now */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 rounded-lg border p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Printer className="h-4 w-4" />
            <span className="text-sm font-medium">Active Prints</span>
          </div>
          <div className="text-3xl font-bold">0</div>
        </div>

        <div className="space-y-2 rounded-lg border p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Pending Prints</span>
          </div>
          <div className="text-3xl font-bold">0</div>
        </div>

        <div className="space-y-2 rounded-lg border p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-sm font-medium">Total Prints</span>
          </div>
          <div className="text-3xl font-bold">0</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/dashboard/orders">
              <Printer className="mr-2 h-4 w-4" />
              View All Orders
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
