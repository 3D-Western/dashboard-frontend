import { redirect } from 'next/navigation';
import { Routes } from '@/lib/routes';

// TEMP: Water Jet Cutting jobs are out of scope for the initial launch (3D printing only) — delete this
// guard when they're ready to ship. See docs/LAUNCH_SCOPE.md.
export default function WaterJetJobsLayout({ children }: { children: React.ReactNode }) {
  redirect(Routes.jobs.newPrintJob);
  return children;
}
