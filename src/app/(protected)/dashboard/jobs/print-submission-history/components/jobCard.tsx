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
    <div
      className="
        cursor-pointer
        rounded-xl
        border
        p-5
        transition-all
        hover:bg-muted/30
        hover:shadow-md
        h-full
        flex
        flex-col
        justify-between
      "
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold line-clamp-2">
            {job.name}
          </h3>

          <span
            className="
              mt-2
              inline-flex
              rounded-full
              border
              px-2
              py-1
              text-xs
            "
          >
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