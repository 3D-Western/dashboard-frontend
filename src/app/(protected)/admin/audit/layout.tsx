import { redirect } from 'next/navigation';
import { TrainingAdminRoutes } from '@/lib/training-admin-routes';

// The audit log lives in the training editor now (/admin/training/audit-log). This old address
// had only a placeholder page, so it sends people to the real log.
export default function AdminAuditLayout({ children }: { children: React.ReactNode }) {
  redirect(TrainingAdminRoutes.auditLog);
  return children;
}
