import type { IamPermission } from '@/types/iam';

export const IAM_GROUP_PREFIXES = {
  USERS: 'users',
  JOBS: 'jobs',
  FILES: 'files',
  INVITATIONS: 'invitations',
  SESSIONS: 'sessions',
  IAM: 'iam',
  AUDIT: 'audit',
} as const;

type IamPermissionGroupPrefix = (typeof IAM_GROUP_PREFIXES)[keyof typeof IAM_GROUP_PREFIXES];
export interface IamPermissionGroup {
  prefix: IamPermissionGroupPrefix;
  permissions: IamPermission[];
  label: string;
}
export type IamPermissionGroups = IamPermissionGroup[];

const IAM_PERMISSION_GROUP_PREFIX_LABELS: Record<IamPermissionGroupPrefix, string> = {
  [IAM_GROUP_PREFIXES.USERS]: 'Users',
  [IAM_GROUP_PREFIXES.JOBS]: 'Jobs',
  [IAM_GROUP_PREFIXES.FILES]: 'Files',
  [IAM_GROUP_PREFIXES.INVITATIONS]: 'Invitations',
  [IAM_GROUP_PREFIXES.SESSIONS]: 'Sessions',
  [IAM_GROUP_PREFIXES.IAM]: 'IAM',
  [IAM_GROUP_PREFIXES.AUDIT]: 'Audit',
};

export function getIamPermissionGroupLabel(groupKey: string): string {
  const prefix = groupKey.split(':')[0] as IamPermissionGroupPrefix;
  return IAM_PERMISSION_GROUP_PREFIX_LABELS[prefix] ?? groupKey;
}

/**
 * Sorts permissions by their group and then sorts the groups themselves.
 * @param permissions The list of permissions to sort and group. Each permission's key is expected to be in the format "group:action".
 * @param sorted The sort order, either 'asc' for ascending or 'desc' for descending. Defaults to 'desc'.
 * @returns An array of permission groups, where each group contains its prefix, the permissions belonging to that group, and a human-readable label.
 */
export function sortPermissionsByGroup(
  permissions: IamPermission[],
  sorted: string = 'desc',
): IamPermissionGroups {
  const groups: Record<string, IamPermission[]> = {};

  permissions.forEach((perm) => {
    const prefix = perm.key.split(':')[0];
    if (!groups[prefix]) {
      groups[prefix] = [];
    }
    groups[prefix].push(perm);
  });

  // Sort permissions within each group and then sort the groups themselves
  return Object.entries(groups)
    .map(([prefix, perms]) => ({
      prefix: prefix as IamPermissionGroupPrefix,
      permissions: perms.sort((a, b) => {
        if (sorted === 'asc') {
          return a.key.localeCompare(b.key);
        } else {
          return b.key.localeCompare(a.key);
        }
      }),
      label: getIamPermissionGroupLabel(prefix),
    }))
    .sort((a, b) => {
      if (sorted === 'asc') {
        return a.label.localeCompare(b.label);
      } else {
        return b.label.localeCompare(a.label);
      }
    });
}
