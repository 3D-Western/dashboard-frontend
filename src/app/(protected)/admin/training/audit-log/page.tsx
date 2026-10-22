import type { Metadata } from 'next';
import { TrainingAuditLog } from '@/components/TrainingAdmin/TrainingAuditLog';

export const metadata: Metadata = {
  title: 'Training Audit Log',
  description: 'Who changed what in the training editor and in sign-offs',
};

/** Readable with `training:author` or `training:publish` (the training layout checks that). */
export default function AdminTrainingAuditLogPage() {
  return <TrainingAuditLog />;
}
