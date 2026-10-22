import { redirect } from 'next/navigation';
import { Routes } from '@/lib/routes';

// Job details moved from Print History to /dashboard/jobs/[jobId]; keep old links working.
export default async function PrintSubmissionHistoryJobRedirect({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  redirect(Routes.jobs.detail(jobId));
}
