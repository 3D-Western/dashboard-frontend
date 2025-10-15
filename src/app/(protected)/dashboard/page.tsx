'use client';
import PrintJobsTable from '@/components/PrintJobsTable';
import { getPrintJobs } from '@/services/print-job-services';
import { PrintJob } from '@/types/jobs';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    getPrintJobs()
      .then((jobs) => {
        setPrintJobs(jobs);
        setIsLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch print jobs');
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="container p-6 space-y-6">
      <div className="space-y-2">
        <div className="font-bold text-4xl">Prints</div>
        <div className="text-muted-foreground">Manage your prints</div>
      </div>

      <div className="">
        <PrintJobsTable printJobs={printJobs} />
      </div>
    </div>
  );
}
