import JobList from './components/jobList';
import { userApi } from '@/api/client/user';
import { JobDetail } from '@/types/jobs';

export default async function PrintSubmissionHistory() {
  let fetchedJobs: JobDetail[] = [];

  try {
    // Scoped to the current user server-side (GET /users/me/jobs) — do not swap this back to
    // jobApi.listAllJobs(), which is the admin "every user's jobs" endpoint and previously
    // leaked every student's print history to every other student on this page.
    const response = await userApi.getCurrentUserJobs();
    fetchedJobs = response.data as unknown as JobDetail[];
  } catch (error) {
    console.error('Failed to fetch print submission history:', error);
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">Print Submission History</h1>

        <p className="mt-2 text-muted-foreground">
          View previously submitted fabrication jobs and their details.
        </p>
      </div>
      <JobList jobs={fetchedJobs} />
    </main>
  );
}
