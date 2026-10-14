import type { StatusOption } from '@/components/Filters';
import { PrintJobStatus } from '@/types/jobs';

// How each backend job status is presented to users. This is the one place to update when the
// backend adds the Draft / Submitted (in review) statuses we've asked for.

export type StageTone = 'purple' | 'green' | 'blue' | 'red' | 'yellow' | 'gray';

export interface JobStage {
  /** Short status label shown above the job name */
  label: string;
  tone: StageTone;
  /** One line telling the user where their job is and what (if anything) to do next */
  message: string;
  /** Label of the row's main button, which opens the job's details page */
  actionLabel: string;
}

export const JOB_STAGES: Record<PrintJobStatus, JobStage> = {
  PendingFile: {
    label: 'Draft',
    tone: 'gray',
    message: "Your file didn't finish uploading. Upload it to submit this job.",
    actionLabel: 'Upload file',
  },
  InQueue: {
    label: 'In queue',
    tone: 'blue',
    message: 'Waiting in the queue for a free printer.',
    actionLabel: 'View details',
  },
  Printing: {
    label: 'Printing',
    tone: 'green',
    message: 'Your design is on the printer.',
    actionLabel: 'View details',
  },
  Ready: {
    label: 'Ready for pickup',
    tone: 'purple',
    message: 'Your print is done and ready to pick up.',
    actionLabel: 'Pickup info',
  },
  Succeeded: {
    label: 'Completed',
    tone: 'purple',
    message: 'This print is finished.',
    actionLabel: 'View details',
  },
  Flagged: {
    label: 'Declined',
    tone: 'red',
    message: 'Your job was declined. Review why before submitting it again.',
    actionLabel: 'Review',
  },
  Failed: {
    label: 'Print failed',
    tone: 'red',
    message: 'The printer failed on this job. See the details for next steps.',
    actionLabel: 'View details',
  },
  Error: {
    label: 'Error',
    tone: 'red',
    message: 'Something went wrong with this job.',
    actionLabel: 'View details',
  },
  Cancelled: {
    label: 'Cancelled',
    tone: 'gray',
    message: 'This job was cancelled.',
    actionLabel: 'View details',
  },
};

// Full class names (not built from strings) so Tailwind can find them.
export const TONE_CLASSES: Record<StageTone, { bar: string; text: string; tint: string }> = {
  purple: {
    bar: 'bg-status-purple',
    text: 'text-status-purple-foreground',
    tint: 'bg-status-purple/10',
  },
  green: {
    bar: 'bg-status-green',
    text: 'text-status-green-foreground',
    tint: 'bg-status-green/10',
  },
  blue: { bar: 'bg-status-blue', text: 'text-status-blue-foreground', tint: 'bg-status-blue/10' },
  red: { bar: 'bg-status-red', text: 'text-status-red-foreground', tint: 'bg-status-red/10' },
  yellow: {
    bar: 'bg-status-yellow',
    text: 'text-status-yellow-foreground',
    tint: 'bg-status-yellow/10',
  },
  gray: { bar: 'bg-status-gray', text: 'text-status-gray-foreground', tint: 'bg-status-gray/10' },
};

/** Status dropdown options on My Jobs, in the order a job moves through them. */
export const JOB_STATUS_FILTER_OPTIONS: StatusOption<PrintJobStatus>[] = (
  [
    'PendingFile',
    'InQueue',
    'Printing',
    'Ready',
    'Succeeded',
    'Flagged',
    'Failed',
    'Error',
    'Cancelled',
  ] as const
).map((status) => ({
  value: status,
  label: JOB_STAGES[status].label,
  dotClassName: TONE_CLASSES[JOB_STAGES[status].tone].bar,
}));

/** Statuses a user can still delete their own job in (matches the API's rule). */
export const DELETABLE_STATUSES: PrintJobStatus[] = ['PendingFile', 'InQueue'];
