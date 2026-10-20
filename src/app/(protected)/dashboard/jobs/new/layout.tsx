import { redirect } from 'next/navigation';
import { Routes } from '@/lib/routes';

// TEMP: 3D printing is the only job type at launch, so skip the job-type picker and go straight
// to the 3D print form — delete this guard when CNC / laser / water jet jobs ship.
// See docs/LAUNCH_SCOPE.md.
export default function NewJobLayout({ children }: { children: React.ReactNode }) {
  redirect(Routes.jobs.newPrintJob);
  return children;
}
