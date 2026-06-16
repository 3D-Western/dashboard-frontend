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
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
        />
      ))}
    </div>
  );
}