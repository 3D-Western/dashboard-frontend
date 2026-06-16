import JobCard from './jobCard';
import { JobDetail } from '@/types/jobs';

interface JobListProps {
  jobs: JobDetail[];
}

export default function JobList({
  jobs,
}: JobListProps) {
  return (
    <div className="grid gap-4">
      {jobs.map((job) => {
        
        const jobWithMappedDate = {
          ...job,
          dateSubmitted: job.dateSubmitted || job.jobPlaced,
        };

        return (
          <JobCard
            key={jobWithMappedDate.id}
            job={jobWithMappedDate as JobDetail}
          />
        );
      })}
    </div>
  );
}