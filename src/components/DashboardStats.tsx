'use client';

import { useEffect, useState } from 'react';
import { Printer, Clock, Layers, type LucideIcon } from 'lucide-react';
import { userApi } from '@/api/client/user';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DashboardCounts {
  total: number;
  active: number;
  pending: number;
}

// Tile colours follow the job status palette: green = printing, blue = in queue, purple = done
const STATS: { key: keyof DashboardCounts; label: string; icon: LucideIcon; iconClass: string }[] =
  [
    {
      key: 'active',
      label: 'Active prints',
      icon: Printer,
      iconClass: 'bg-status-green/15 text-status-green-foreground',
    },
    {
      key: 'pending',
      label: 'Pending prints',
      icon: Clock,
      iconClass: 'bg-status-blue/15 text-status-blue-foreground',
    },
    {
      key: 'total',
      label: 'Total prints',
      icon: Layers,
      iconClass: 'bg-status-purple/15 text-status-purple-foreground',
    },
  ];

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
    <dl className="grid gap-3 sm:grid-cols-3">
      {STATS.map(({ key, label, icon: Icon, iconClass }) => (
        // A compact row on phones; label over a big number from sm up
        <div
          key={key}
          className="flex items-center gap-3 rounded-lg bg-muted/60 p-4 sm:block sm:space-y-3"
        >
          <div className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-md',
                iconClass,
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <dt className="text-sm text-muted-foreground">{label}</dt>
          </div>
          <dd className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {isLoading ? (
              <Skeleton
                className="h-8 w-10 sm:h-9 sm:w-12"
                aria-label={`Loading ${label.toLowerCase()}`}
              />
            ) : (
              counts[key]
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
