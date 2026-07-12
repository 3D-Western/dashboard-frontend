'use client';

import { PrintJobStatusBadge } from '@/components/PrintJobStatusBadge';
import { JobDetail } from '@/types/jobs';

function formatJobDate(isoString?: string) {
  if (!isoString) return 'Unknown Date';

  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

interface JobCardProps {
  job: JobDetail;
}

const categoryLabels = {
  ThreeDPrint: '3D Printing',
  CNC: 'CNC',
  Waterjet: 'Waterjet',
  LaserCutting: 'Laser Cutting',
};

export default function JobCard({ job }: JobCardProps) {
  return (
    <div className="flex h-full cursor-pointer flex-col justify-between rounded-xl border p-5 transition-all hover:bg-muted/30 hover:shadow-md">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h3 className="line-clamp-2 text-lg font-semibold">{job.name}</h3>

          <span className="mt-2 inline-flex rounded-full border px-2 py-1 text-xs">
            {categoryLabels[job.category as keyof typeof categoryLabels]}
          </span>
        </div>

        <div className="shrink-0">
          <PrintJobStatusBadge status={job.status} />
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Submitted {formatJobDate(job.dateSubmitted)}
      </p>
    </div>
  );
}
