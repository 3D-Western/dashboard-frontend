import React from 'react';
import { PrintJobStatusBadge } from '@/components/PrintJobStatusBadge';
import { PrintSpecifications } from './PrintSpecifications';
import { StatusStepper } from './StatusStepper';
import { JobDetail } from '@/types/jobs';

interface JobDetailContentProps {
  job: JobDetail;
}

export function JobDetailContent({ job }: JobDetailContentProps) {
  return (
    <div className="space-y-6 pb-6">
      {/* HEADER */}
      <div>
        <h1 className="pr-8 text-3xl font-bold">{job.name}</h1>
        <div className="mt-2">
          <PrintJobStatusBadge status={job.status} />
        </div>
      </div>

      {job.status === 'PendingFile' && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4">
          <h2 className="font-semibold text-red-800">File Upload Incomplete</h2>
          <p className="mb-3 text-sm text-red-700">
            The file for this print job failed to upload properly.
          </p>
          <button className="rounded bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700">
            Retry Upload
          </button>
        </div>
      )}

      {(job.status === 'InQueue' || job.status === 'Printing') && job.jobETA && (
        <div className="rounded-xl border bg-muted/10 p-4">
          <h2 className="font-semibold">Estimated Completion Time</h2>
          <p>{new Date(job.jobETA.estimatedCompletionTime).toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last updated: {new Date(job.jobETA.updatedAt).toLocaleString()}
          </p>
        </div>
      )}

      {job.status === 'Ready' && job.pickupDetails && (
        <div className="rounded-xl border bg-green-50 p-4">
          <h2 className="font-semibold text-green-900">Ready for Pickup!</h2>
          <ul className="mt-2 space-y-1 text-sm text-green-800">
            <li>
              <strong>Location:</strong> {job.pickupDetails.location}
            </li>
            <li>
              <strong>Hours:</strong> {job.pickupDetails.hours}
            </li>
            <li>
              <strong>Instructions:</strong> {job.pickupDetails.instructions}
            </li>
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Description
          </h2>
          <p className="text-sm font-medium">{job.description || 'No description provided.'}</p>
        </div>

        <div>
          <h2 className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Category
          </h2>
          <p className="text-sm font-medium">{job.category}</p>
        </div>

        <div>
          <h2 className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Submitted
          </h2>
          <p className="text-sm font-medium">
            {job.dateSubmitted ? new Date(job.dateSubmitted).toLocaleDateString() : 'Unknown Date'}
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Comments
          </h2>
          <p className="text-sm font-medium">{job.comments || 'No comments.'}</p>
        </div>
      </div>

      {/* PRINT SPECIFICATIONS */}
      <div>
        <h2 className="mb-2 font-semibold">Print Specifications</h2>
        <PrintSpecifications specsJson={job.formAnswersJson} />
      </div>

      {/* STATUS HISTORY */}
      {job.statusHistory && job.statusHistory.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold">Status History</h2>
          <div className="rounded-xl border bg-muted/5 p-4">
            <StatusStepper currentStatus={job.status} history={job.statusHistory} />
          </div>
        </div>
      )}
    </div>
  );
}
