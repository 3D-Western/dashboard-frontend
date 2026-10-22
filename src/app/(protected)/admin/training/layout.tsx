import { TrainingAdminShell } from '@/components/TrainingAdmin/TrainingAdminShell';

// Force dynamic rendering: the shell reads the signed-in user's permissions.
export const dynamic = 'force-dynamic';

export default function AdminTrainingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <TrainingAdminShell>{children}</TrainingAdminShell>
    </div>
  );
}
