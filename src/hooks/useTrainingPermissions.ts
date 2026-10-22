import { PERMISSIONS } from '@/constants/permissions';
import { useUser } from '@/providers/user-provider';
import { hasPermission } from '@/types/user';

export interface TrainingPermissions {
  /** Read and edit trainings, questions, equipment and imports. */
  canAuthor: boolean;
  /** Publish a draft, add corrections to published questions, and re-score. */
  canPublish: boolean;
  /** Either one: enough to see the training editor in the menu. */
  canSee: boolean;
}

/** What the signed-in user may do in the admin training editor. */
export function useTrainingPermissions(): TrainingPermissions {
  const user = useUser();
  const canAuthor = hasPermission(user, PERMISSIONS.TRAINING_AUTHOR);
  const canPublish = hasPermission(user, PERMISSIONS.TRAINING_PUBLISH);
  return { canAuthor, canPublish, canSee: canAuthor || canPublish };
}
