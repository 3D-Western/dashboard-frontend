import { PrintJob } from '@/types/jobs';
import { jobApi } from '@/api/client/job';

/**
 * Fetches all print jobs for the current user
 * @throws {ApiError} If the request fails (network error, server error, etc.)
 * Note: SESSION_INVALID errors should be caught by the layout before this is called
 */
export async function getPrintJobs(): Promise<PrintJob[]> {
  const response = await jobApi.listAllJobs();
  return response.jobs;
}
