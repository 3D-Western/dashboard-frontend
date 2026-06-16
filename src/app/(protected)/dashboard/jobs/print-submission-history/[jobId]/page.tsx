import { jobApi } from '@/api/client/job';
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

  let job = null;
  try {
    const response = await jobApi.getJobById(jobId);
    job = (response as any).data ? (response as any).data : response;
    
    console.log('Fetched job from API:', job);
  } catch (error) {
    console.error('Failed to fetch job:', error);
  }

  if (!job) {
    return (
      <div className="p-6 text-center text-gray-500">
        <h2 className="text-xl font-semibold text-gray-700">Job not found</h2>
        <p>This print job either doesn't exist or you don't have permission to view it.</p>
      </div>
    );
  }

  let parsedFormAnswers = {};
  try {
    if (job.formAnswersJson) parsedFormAnswers = JSON.parse(job.formAnswersJson);
  } catch (e) {
    console.error("Failed to parse form answers");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        {job.name}
      </h1>

      <PrintJobStatusBadge status={job.status} />

      {job.status === 'PendingFile' && (
        <div className="p-4 border border-red-300 bg-red-50 rounded">
          <h2 className="font-semibold text-red-800">File Upload Incomplete</h2>
          <p className="text-red-700 text-sm mb-3">The file for this print job failed to upload properly.</p>
          <button className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors">
            Retry Upload
          </button>
        </div>
      )}

      {(job.status === 'InQueue' || job.status === 'Printing') && job.jobETA && (
        <div className="p-4 border bg-black-50 rounded">
          <h2 className="font-semibold">Estimated Completion Time</h2>
          <p>{new Date(job.jobETA.estimatedCompletionTime).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {new Date(job.jobETA.updatedAt).toLocaleString()}
          </p>
        </div>
      )}

      {job.status === 'Ready' && job.pickupDetails && (
        <div className="p-4 border bg-green-50 rounded">
          <h2 className="font-semibold text-green-900">Ready for Pickup!</h2>
          <ul className="mt-2 text-sm space-y-1 text-green-800">
            <li><strong>Location:</strong> {job.pickupDetails.location}</li>
            <li><strong>Hours:</strong> {job.pickupDetails.hours}</li>
            <li><strong>Instructions:</strong> {job.pickupDetails.instructions}</li>
          </ul>
        </div>
      )}

      <div>
        <h2 className="font-semibold">Description</h2>
        <p className="text-gray-700">{job.description || 'No description provided.'}</p>
      </div>

      <div>
        <h2 className="font-semibold">Category</h2>
        <p className="text-gray-700">{job.category}</p>
      </div>
      {Object.keys(parsedFormAnswers).length > 0 && (
        <div>
          <h2 className="font-semibold">Print Specifications</h2>
          <div className="bg-gray-50 border p-3 rounded text-sm mt-1 overflow-auto">
            <pre className="text-gray-700">{JSON.stringify(parsedFormAnswers, null, 2)}</pre>
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold">Submitted</h2>
        <p className="text-gray-700">
          {job.dateSubmitted ? new Date(job.dateSubmitted).toLocaleDateString() : 'Unknown Date'}
        </p>
      </div>

      <div>
        <h2 className="font-semibold">Comments</h2>
        <p className="text-gray-700">{job.comments || 'No comments.'}</p>
      </div>

      {job.statusHistory && job.statusHistory.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Status History</h2>
          <div className="border p-4 rounded bg-gray-50">
            <ul className="space-y-4">
              {job.statusHistory.map((historyItem: any, index: number) => (
                <li key={index} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{historyItem.status}</span> 
                    <span className="text-gray-500 text-xs">
                      {new Date(historyItem.changedAt).toLocaleString()}
                    </span>
                  </div>
                  {historyItem.comments && (
                    <p className="text-gray-600 mt-1 pl-3 border-l-2 border-gray-300">
                      {historyItem.comments}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}