'use client';

import { useState } from 'react';
import JobCard from './jobCard';
import { JobDetail } from '@/types/jobs';
import { JobDetailContent } from './JobDetailContent';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface JobListProps {
  jobs: JobDetail[];
}

export default function JobList({ jobs }: JobListProps) {
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null);

  return (
    <>
      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => {
          const jobWithMappedDate = {
            ...job,
            dateSubmitted: job.dateSubmitted || job.jobPlaced,
          };

          return (
            <div
              key={jobWithMappedDate.id}
              onClick={() => setSelectedJob(jobWithMappedDate as JobDetail)}
              className="h-full"
            >
              <JobCard job={jobWithMappedDate as JobDetail} />
            </div>
          );
        })}
      </div>

      {/* Modal Overlay for Job Details */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto sm:rounded-2xl md:max-w-2xl lg:max-w-3xl">
          <DialogTitle className="sr-only">Job Details</DialogTitle>
          <DialogDescription className="sr-only">
            View the specifications, status, and history of the selected print job.
          </DialogDescription>
          {selectedJob && <JobDetailContent job={selectedJob} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
