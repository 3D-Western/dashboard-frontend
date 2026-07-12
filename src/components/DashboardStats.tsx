'use client';

import { useEffect, useState } from 'react';
import { Printer, Clock, LayoutDashboard } from 'lucide-react';
import { userApi } from '@/api/client/user';

export default function DashboardStats() {
  const [jobCount, setJobCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const jobs = await userApi.getCurrentUserJobs();
        setJobCount(jobs.pagination?.totalItems || jobs.data.length || 0);
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
        <div className="text-3xl font-bold">{isLoading ? '...' : jobCount}</div>
      </div>

      <div className="space-y-2 rounded-lg border p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Pending Prints</span>
        </div>
        <div className="text-3xl font-bold">{isLoading ? '...' : 0}</div>
      </div>

      <div className="space-y-2 rounded-lg border p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-sm font-medium">Total Prints</span>
        </div>
        <div className="text-3xl font-bold">{isLoading ? '...' : jobCount}</div>
      </div>
    </div>
  );
}
