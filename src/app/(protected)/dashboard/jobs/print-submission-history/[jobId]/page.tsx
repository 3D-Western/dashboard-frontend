import { mockJobs } from "../mockData";
import { PrintJobStatusBadge } from "@/components/PrintJobStatusBadge";

interface PageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export default async function JobDetailPage({ params }: PageProps) {
  const { jobId } = await params;

  const job = mockJobs.find((job) => job.id === jobId);

  console.log("jobId:", jobId);
  console.log("found job:", job);

  if (!job) {
    return <div>Job not found</div>;
  }

  // Parse print specs safely
  const specs =
    typeof job.formAnswersJson === "string"
      ? JSON.parse(job.formAnswersJson)
      : job.formAnswersJson;

  const statusHistory = job.statusHistory || [];

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      {/* HEADER */}
      <h1 className="text-3xl font-bold">{job.name}</h1>
      <PrintJobStatusBadge status={job.status} />

      {/* DESCRIPTION */}
      <div>
        <h2 className="font-semibold">Description</h2>
        <p>{job.description}</p>
      </div>

      {/* CATEGORY */}
      <div>
        <h2 className="font-semibold">Category</h2>
        <p>{job.category}</p>
      </div>

      {/* SUBMITTED */}
      <div>
        <h2 className="font-semibold">Submitted</h2>
        <p>{job.dateSubmitted}</p>
      </div>

      {/* COMMENTS */}
      <div>
        <h2 className="font-semibold">Comments</h2>
        <p>{job.comments}</p>
      </div>

      {/* ========================= */}
      {/* ETA DISPLAY BOX */}
      {/* ========================= */}
      {["InQueue", "Printing"].includes(job.status) && job.jobETA && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-700">
            Estimated Completion
          </p>

          <p className="text-lg font-semibold text-blue-900">
            {new Date(job.jobETA.estimatedCompletionTime).toLocaleString()}
          </p>

          <p className="text-xs text-blue-600 mt-1">
            Updated {new Date(job.jobETA.updatedAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* ========================= */}
      {/* FILE UPLOAD FAILURE + RETRY */}
      {/* ========================= */}
      {job.status === "PendingFile" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-red-800">
              File upload failed
            </p>

            <p className="text-sm text-red-700">
              {job.apiError || "An error occurred while uploading your file."}
            </p>
          </div>

          <button
            onClick={() => console.log("Retry upload", job.id)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
          >
            Retry Upload
          </button>
        </div>
      )}

      {/* ========================= */}
      {/* PICKUP DETAILS CARD */}
      {/* ========================= */}
      {job.status === "Ready" && job.pickupDetails && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h3 className="font-semibold text-green-800">
            Pickup Details
          </h3>

          <p className="text-sm mt-2">
            <span className="font-medium">Location:</span>{" "}
            {job.pickupDetails.location}
          </p>

          <p className="text-sm">
            <span className="font-medium">Hours:</span>{" "}
            {job.pickupDetails.hours}
          </p>

          {job.pickupDetails.instructions && (
            <p className="text-sm mt-2 text-green-700">
              {job.pickupDetails.instructions}
            </p>
          )}
        </div>
      )}

      {/* ========================= */}
      {/* PRINT SPECIFICATIONS */}
      {/* ========================= */}
      <div className="bg-gray-50 border rounded-xl p-4">
        <h3 className="font-semibold mb-3">
          Print Specifications
        </h3>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {Object.entries(specs || {}).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between bg-white border rounded-lg p-2"
            >
              <span className="text-gray-600 font-medium">
                {key}
              </span>
              <span className="text-gray-900">
                {String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================= */}
      {/* STATUS HISTORY TIMELINE */}
      {/* ========================= */}
      {statusHistory.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold mb-4">
            Status History
          </h3>

          <div className="relative border-l border-gray-300 ml-2">
            {statusHistory.map((item, idx) => (
              <div key={idx} className="ml-4 mb-6 relative">
                {/* dot */}
                <div className="absolute -left-[9px] top-1 w-3 h-3 bg-gray-400 rounded-full" />

                <p className="font-medium">
                  {item.status}
                </p>

                <p className="text-xs text-gray-500">
                  {new Date(item.changedAt).toLocaleString()}
                </p>

                {item.comments && (
                  <p className="text-sm text-gray-600 mt-1">
                    {item.comments}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}