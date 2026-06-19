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
        <h1 className="text-3xl font-bold pr-8">{job.name}</h1>
        <div className="mt-2">
          <PrintJobStatusBadge status={job.status} />
        </div>
      </div>

      {job.status === 'PendingFile' && (
        <div className="p-4 border border-red-300 bg-red-50 rounded-xl">
          <h2 className="font-semibold text-red-800">File Upload Incomplete</h2>
          <p className="text-red-700 text-sm mb-3">The file for this print job failed to upload properly.</p>
          <button className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors">
            Retry Upload
          </button>
        </div>
      )}

      {(job.status === 'InQueue' || job.status === 'Printing') && job.jobETA && (
        <div className="p-4 border bg-muted/10 rounded-xl">
          <h2 className="font-semibold">Estimated Completion Time</h2>
          <p>{new Date(job.jobETA.estimatedCompletionTime).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {new Date(job.jobETA.updatedAt).toLocaleString()}
          </p>
        </div>
      )}

      {job.status === 'Ready' && job.pickupDetails && (
        <div className="p-4 border bg-green-50 rounded-xl">
          <h2 className="font-semibold text-green-900">Ready for Pickup!</h2>
          <ul className="mt-2 text-sm space-y-1 text-green-800">
            <li><strong>Location:</strong> {job.pickupDetails.location}</li>
            <li><strong>Hours:</strong> {job.pickupDetails.hours}</li>
            <li><strong>Instructions:</strong> {job.pickupDetails.instructions}</li>
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-1">Description</h2>
          <p className="text-sm font-medium">{job.description || 'No description provided.'}</p>
        </div>
        
        <div>
          <h2 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-1">Category</h2>
          <p className="text-sm font-medium">{job.category}</p>
        </div>

        <div>
          <h2 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-1">Submitted</h2>
          <p className="text-sm font-medium">
            {job.dateSubmitted ? new Date(job.dateSubmitted).toLocaleDateString() : 'Unknown Date'}
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-1">Comments</h2>
          <p className="text-sm font-medium">{job.comments || 'No comments.'}</p>
        </div>
      </div>

      {/* PRINT SPECIFICATIONS */}
      <div>
        <h2 className="font-semibold mb-2">Print Specifications</h2>
        <PrintSpecifications specsJson={job.formAnswersJson} />
      </div>

      {/* STATUS HISTORY */}
      {job.statusHistory && job.statusHistory.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Status History</h2>
          <div className="border p-4 rounded-xl bg-muted/5">
            <StatusStepper currentStatus={job.status} history={job.statusHistory} />
          </div>
        </div>
      )}
    </div>
  );
}