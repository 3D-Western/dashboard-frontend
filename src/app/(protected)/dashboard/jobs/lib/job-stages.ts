import type { StatusOption } from '@/components/Filters';
import { PrintJobStatus } from '@/types/jobs';

// How each backend job status is presented to users. This is the one place to update when the
// backend adds the Draft / Submitted (in review) statuses we've asked for.
//
// Users see six one-word statuses, one colour each, in the order a job moves through them:
// Draft → Queued → Printing → Ready → Collected, plus Issue. Issue covers every way a job can
// stop (declined, print failed, error, cancelled by staff); the message and the job's details
// page say which one it was. Admins still see all nine backend statuses.

export type StageTone = 'purple' | 'pink' | 'green' | 'blue' | 'red' | 'yellow' | 'gray';

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
    label: 'Queued',
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
    label: 'Ready',
    tone: 'pink',
    message: 'Your print is done and ready for pickup.',
    actionLabel: 'Pickup info',
  },
  Succeeded: {
    label: 'Collected',
    tone: 'purple',
    message: 'You picked up this print.',
    actionLabel: 'View details',
  },
  Flagged: {
    label: 'Issue',
    tone: 'red',
    message: 'Your job was declined. Review why before submitting it again.',
    actionLabel: 'Review',
  },
  Failed: {
    label: 'Issue',
    tone: 'red',
    message: 'The printer failed on this job. See the details for next steps.',
    actionLabel: 'View details',
  },
  Error: {
    label: 'Issue',
    tone: 'red',
    message: 'Something went wrong with this job.',
    actionLabel: 'View details',
  },
  Cancelled: {
    label: 'Issue',
    tone: 'red',
    message: "This job was cancelled and won't be printed.",
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
  pink: { bar: 'bg-status-pink', text: 'text-status-pink-foreground', tint: 'bg-status-pink/10' },
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

/**
 * Status dropdown options on My Jobs, in the order a job moves through them. Like main's
 * JobPageFilters, each option filters by one backend status (the API takes a single status), so
 * "Issue" finds Failed jobs only; declined, errored and cancelled jobs have no filter option.
 */
export const JOB_STATUS_FILTER_OPTIONS: StatusOption<PrintJobStatus>[] = (
  ['PendingFile', 'InQueue', 'Printing', 'Ready', 'Succeeded', 'Failed'] as const
).map((status) => ({
  value: status,
  label: JOB_STAGES[status].label,
  dotClassName: TONE_CLASSES[JOB_STAGES[status].tone].bar,
}));

/** Statuses a user can still delete their own job in (matches the API's rule). */
export const DELETABLE_STATUSES: PrintJobStatus[] = ['PendingFile', 'InQueue'];
