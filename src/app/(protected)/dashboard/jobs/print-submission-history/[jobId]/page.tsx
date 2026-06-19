import { jobApi } from '@/api/client/job';
import { JobDetailContent } from '../components/JobDetailContent';
import { JobDetail } from '@/types/jobs';

interface PageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export default async function JobDetailPage({ params }: PageProps) {
  const { jobId } = await params;

  let job = null;
  try {
    const response = await jobApi.getJobById(jobId);
    const res = response as { data?: JobDetail };
    job = res.data ? res.data : response;
  } catch (error) {
    console.error('Failed to fetch job:', error);
  }

  if (!job) {
    return (
      <div className="p-6 text-center text-gray-500">
        <h2 className="text-xl font-semibold text-gray-700">Job not found</h2>
        <p>
          This print job either doesn&apos;t exist or you don&apos;t have permission to view it.
        </p>
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 md:p-8">
      <div className="rounded-2xl border bg-background p-6 shadow-sm md:p-8">
        <JobDetailContent job={job} />
      </div>
    </main>
  );
}
