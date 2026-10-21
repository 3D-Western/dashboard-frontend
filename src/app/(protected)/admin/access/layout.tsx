import { AccessAdminShell } from '@/components/AccessAdmin/AccessAdminShell';

// Force dynamic rendering: the shell reads the signed-in user's permissions.
export const dynamic = 'force-dynamic';

export default function AdminAccessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <AccessAdminShell>{children}</AccessAdminShell>
    </div>
  );
}
