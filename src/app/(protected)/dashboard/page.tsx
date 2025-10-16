import { Button } from '@/components/ui/button';
import { Printer, LayoutDashboard, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  return (
    <div className="container p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <p className="text-muted-foreground">Welcome to Western 3D Print Club Dashboard</p>
      </div>

      {/* Quick Stats - Placeholder for now */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-6 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Printer className="h-4 w-4" />
            <span className="text-sm font-medium">Active Prints</span>
          </div>
          <div className="text-3xl font-bold">0</div>
        </div>

        <div className="rounded-lg border p-6 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Pending Prints</span>
          </div>
          <div className="text-3xl font-bold">0</div>
        </div>

        <div className="rounded-lg border p-6 space-y-2">
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
            <Link href="/print">
              <Printer className="h-4 w-4 mr-2" />
              View All Prints
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
