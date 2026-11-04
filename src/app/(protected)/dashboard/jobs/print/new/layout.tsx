import { redirect } from 'next/navigation';
import { isJobCreationEnabled } from '@/lib/feature-flags';
import { Routes } from '@/lib/routes';

// Job creation can be switched off (src/lib/feature-flags.ts, docs/LAUNCH_SCOPE.md): then this
// route, and anything linking here, goes back to My Jobs instead of a half-hidden flow.
export default function NewPrintJobLayout({ children }: { children: React.ReactNode }) {
  if (!isJobCreationEnabled()) redirect(Routes.jobs.home);
  return children;
}
