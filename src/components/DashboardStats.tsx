'use client';

import { useEffect, useState } from 'react';
import { Printer, Clock, LayoutDashboard } from 'lucide-react';
import { userApi } from '@/api/client/user';

interface DashboardCounts {
  total: number;
  active: number;
  pending: number;
}

export default function DashboardStats() {
  const [counts, setCounts] = useState<DashboardCounts>({ total: 0, active: 0, pending: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [totalRes, printingRes, pendingFileRes, inQueueRes] = await Promise.all([
          userApi.getCurrentUserJobs({ pageSize: 1 }),
          userApi.getCurrentUserJobs({ status: 'Printing', pageSize: 1 }),
          userApi.getCurrentUserJobs({ status: 'PendingFile', pageSize: 1 }),
          userApi.getCurrentUserJobs({ status: 'InQueue', pageSize: 1 }),
        ]);

        setCounts({
          total: totalRes.pagination?.totalItems ?? 0,
          active: printingRes.pagination?.totalItems ?? 0,
          pending:
            (pendingFileRes.pagination?.totalItems ?? 0) + (inQueueRes.pagination?.totalItems ?? 0),
        });
      } catch (error) {
        console.error('Failed to fetch jobs', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2 rounded-lg border p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Printer className="h-4 w-4" />
          <span className="text-sm font-medium">Active Prints</span>
        </div>
        <div className="text-3xl font-bold">{isLoading ? '...' : counts.active}</div>
      </div>

      <div className="space-y-2 rounded-lg border p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Pending Prints</span>
        </div>
        <div className="text-3xl font-bold">{isLoading ? '...' : counts.pending}</div>
      </div>

      <div className="space-y-2 rounded-lg border p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-sm font-medium">Total Prints</span>
        </div>
        <div className="text-3xl font-bold">{isLoading ? '...' : counts.total}</div>
      </div>
    </div>
  );
}
