import type { PrintJob } from '@/types/jobs';
import { isTerminalStatus } from '@/lib/student-status';

/**
 * The job that holds the student's place under the backend's cap on active jobs (it counts jobs
 * in the queue or printing). A 3D-print job that is finished, refused or cancelled does not count.
 */
export function findActiveJob(jobs: readonly PrintJob[] | undefined): PrintJob | null {
  return (
    (jobs ?? []).find(
      (job) =>
        job.category === 'ThreeDPrint' &&
        (job.status === 'InQueue' || job.status === 'Printing') &&
        !(
          job.studentStatus &&
          (isTerminalStatus(job.studentStatus) || job.studentStatus === 'cannot_print')
        ),
    ) ?? null
  );
}
