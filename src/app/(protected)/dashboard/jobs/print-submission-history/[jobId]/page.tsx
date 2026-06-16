import { mockJobs } from '../mockData';
import { PrintJobStatusBadge } from '@/components/PrintJobStatusBadge';

interface PageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export default async function JobDetailPage({
  params,
}: PageProps) {
  const { jobId } = await params;

  const job = mockJobs.find(
    (job) => job.id === jobId
  );

  console.log('jobId:', jobId);
  console.log('found job:', job);

  if (!job) {
    return <div>Job not found</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        {job.name}
      </h1>

      <PrintJobStatusBadge status={job.status} />

      <div>
        <h2 className="font-semibold">
          Description
        </h2>
        <p>{job.description}</p>
      </div>

      <div>
        <h2 className="font-semibold">
          Category
        </h2>
        <p>{job.category}</p>
      </div>

      <div>
        <h2 className="font-semibold">
          Submitted
        </h2>
        <p>{job.dateSubmitted}</p>
      </div>

      <div>
        <h2 className="font-semibold">
          Comments
        </h2>
        <p>{job.comments}</p>
      </div>
    </div>
  );
}