import type { StageTone } from '@/app/(protected)/dashboard/jobs/lib/job-stages';
import type { StudentStatus } from '@/types/pipeline';

// What a student sees for each `studentStatus` the backend sends, in plain words. The backend
// derives the status (silent review and staff holds already read as "preparing"), so this only
// words it; it never maps staff statuses.

export interface StudentStage {
  /** Short status label shown above the job name. */
  label: string;
  tone: StageTone;
  /** One line telling the student where the job is and what, if anything, to do next. */
  message: string;
  /** Label of the row's main button, which opens the job page. */
  actionLabel: string;
  /** The student has something to do (say yes, choose, fix the part). */
  needsAction: boolean;
}

export const STUDENT_STAGES: Record<StudentStatus, StudentStage> = {
  preparing: {
    label: 'Preparing',
    tone: 'gray',
    message: "We're checking your part and getting it ready. You can watch each step.",
    actionLabel: 'View progress',
    needsAction: false,
  },
  needs_confirmation: {
    label: 'Review needed',
    tone: 'yellow',
    message: 'Your print is ready to review. Say yes to send it to the printers.',
    actionLabel: 'Review',
    needsAction: true,
  },
  needs_choice: {
    label: 'Your choice needed',
    tone: 'yellow',
    message: 'We need you to choose how to handle something in your part.',
    actionLabel: 'Choose',
    needsAction: true,
  },
  cannot_print: {
    label: "Can't print",
    tone: 'red',
    message: "This part can't be printed as it is. See why and what to change.",
    actionLabel: 'See why',
    needsAction: true,
  },
  queued: {
    label: 'Queued',
    tone: 'blue',
    message: 'Waiting for a free printer.',
    actionLabel: 'View details',
    needsAction: false,
  },
  printing: {
    label: 'Printing',
    tone: 'green',
    message: 'Your design is on a printer.',
    actionLabel: 'View details',
    needsAction: false,
  },
  reprinting: {
    label: 'Printing again',
    tone: 'green',
    message: "A print didn't work out, so we're trying again. You don't need to do anything.",
    actionLabel: 'View details',
    needsAction: false,
  },
  ready_for_pickup: {
    label: 'Ready',
    tone: 'pink',
    message: 'Your print is done and ready for pickup.',
    actionLabel: 'Pickup info',
    needsAction: false,
  },
  collected: {
    label: 'Collected',
    tone: 'purple',
    message: 'You picked up this print.',
    actionLabel: 'View details',
    needsAction: false,
  },
  not_collected: {
    label: 'Not collected',
    tone: 'gray',
    message: 'The pickup window passed before this print was collected.',
    actionLabel: 'View details',
    needsAction: false,
  },
  rejected: {
    label: 'Not accepted',
    tone: 'red',
    message: "We can't print this job. See the details for why.",
    actionLabel: 'See why',
    needsAction: false,
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'gray',
    message: "This job was cancelled and won't be printed.",
    actionLabel: 'View details',
    needsAction: false,
  },
  expired: {
    label: 'Expired',
    tone: 'gray',
    message: "We didn't hear back in time, so this job expired. Upload it again to start over.",
    actionLabel: 'View details',
    needsAction: false,
  },
};

/** A status the frontend doesn't know yet (the backend added one) still renders sensibly. */
export function studentStage(status: string): StudentStage {
  return (
    (STUDENT_STAGES as Record<string, StudentStage | undefined>)[status] ?? {
      label: status.replaceAll('_', ' '),
      tone: 'gray',
      message: '',
      actionLabel: 'View details',
      needsAction: false,
    }
  );
}

/** No more pipeline events are expected, so the live stream can stay closed. */
export const TERMINAL_STATUSES: readonly StudentStatus[] = [
  'collected',
  'not_collected',
  'rejected',
  'cancelled',
  'expired',
];

export const isTerminalStatus = (status: string): boolean =>
  (TERMINAL_STATUSES as readonly string[]).includes(status);
