import { redirect } from 'next/navigation';
import { Routes } from '@/lib/routes';

// Print History was merged into My Jobs; keep old links and bookmarks working.
export default function PrintSubmissionHistoryRedirect() {
  redirect(Routes.jobs.home);
}
