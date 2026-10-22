import { PERMISSIONS } from '@/constants/permissions';
import { useUser } from '@/providers/user-provider';
import { hasPermission } from '@/types/user';

/** Everything on the admin access pages (gatekeepers, devices, live view, card links) needs `access:admin`. */
export function useAccessPermissions(): { canAdmin: boolean } {
  const user = useUser();
  return { canAdmin: hasPermission(user, PERMISSIONS.ACCESS_ADMIN) };
}
