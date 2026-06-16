'use client';

import { useRouter } from 'next/navigation';
import { PrintJobStatusBadge } from '@/components/PrintJobStatusBadge';
import { JobDetail } from '@/types/jobs';

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
  const router = useRouter();

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
      "
      onClick={() =>
        router.push(
          `/dashboard/jobs/print-submission-history/${job.id}`
        )
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">
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
            {
              categoryLabels[
                job.category as keyof typeof categoryLabels
              ]
            }
          </span>
        </div>

        <PrintJobStatusBadge status={job.status} />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Submitted {job.dateSubmitted}
      </p>
    </div>
  );
}