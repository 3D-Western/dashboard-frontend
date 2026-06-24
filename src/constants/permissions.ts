export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_LIST: 'users:list',
  USERS_CREATE: 'users:create',
  USERS_UPDATE_PROFILE: 'users:update_profile',
  USERS_UPDATE_EMAIL: 'users:update_email',
  USERS_UPDATE_STATUS: 'users:update_status',
  USERS_DELETE: 'users:delete',
  USERS_EXPORT: 'users:export',
  USERS_IMPERSONATE: 'users:impersonate',
  JOBS_CREATE: 'jobs:create',
  JOBS_READ: 'jobs:read',
  JOBS_LIST: 'jobs:list',
  JOBS_UPDATE_STATUS: 'jobs:update_status',
  JOBS_DELETE: 'jobs:delete',
  JOBS_COMPLETE_UPLOAD: 'jobs:complete_upload',
  JOBS_RETRY_UPLOAD: 'jobs:retry_upload',
  JOBS_REORDER: 'jobs:reorder',
  BOOKINGS_LIST: 'bookings:list',
  BOOKINGS_UPDATE_STATUS: 'bookings:update_status',
  BOOKINGS_READ: 'bookings:read',
  FILES_READ_METADATA: 'files:read_metadata',
  FILES_DOWNLOAD: 'files:download',
  FILES_LIST: 'files:list',
  FILES_DELETE: 'files:delete',
  INVITATIONS_CREATE: 'invitations:create',
  INVITATIONS_READ: 'invitations:read',
  INVITATIONS_LIST: 'invitations:list',
  INVITATIONS_REVOKE: 'invitations:revoke',
  SESSIONS_LIST: 'sessions:list',
  SESSIONS_REVOKE: 'sessions:revoke',
  IAM_READ: 'iam:read',
  IAM_ASSIGN_PERMISSIONS: 'iam:assign_permissions',
  IAM_ASSIGN_ROLES: 'iam:assign_roles',
  IAM_MANAGE_GROUPS: 'iam:manage_groups',
  AUDIT_READ: 'audit:read',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionDefinition {
  key: PermissionKey;
  resource: string;
  action: string;
  description: string;
  isDangerous?: boolean;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  {
    key: PERMISSIONS.USERS_READ,
    resource: 'users',
    action: 'read',
    description: 'Read user profile',
  },
  { key: PERMISSIONS.USERS_LIST, resource: 'users', action: 'list', description: 'List all users' },
  {
    key: PERMISSIONS.USERS_CREATE,
    resource: 'users',
    action: 'create',
    description: 'Create a new user',
  },
  {
    key: PERMISSIONS.USERS_UPDATE_PROFILE,
    resource: 'users',
    action: 'update_profile',
    description: 'Update user profile fields',
  },
  {
    key: PERMISSIONS.USERS_UPDATE_EMAIL,
    resource: 'users',
    action: 'update_email',
    description: 'Update user email address',
  },
  {
    key: PERMISSIONS.USERS_UPDATE_STATUS,
    resource: 'users',
    action: 'update_status',
    description: 'Update user account status',
  },
  {
    key: PERMISSIONS.USERS_DELETE,
    resource: 'users',
    action: 'delete',
    description: 'Delete a user account',
    isDangerous: true,
  },
  {
    key: PERMISSIONS.USERS_EXPORT,
    resource: 'users',
    action: 'export',
    description: 'Export user data',
    isDangerous: true,
  },
  {
    key: PERMISSIONS.USERS_IMPERSONATE,
    resource: 'users',
    action: 'impersonate',
    description: 'Impersonate another user',
    isDangerous: true,
  },
  {
    key: PERMISSIONS.JOBS_CREATE,
    resource: 'jobs',
    action: 'create',
    description: 'Create a new job',
  },
  { key: PERMISSIONS.JOBS_READ, resource: 'jobs', action: 'read', description: 'Read job details' },
  { key: PERMISSIONS.JOBS_LIST, resource: 'jobs', action: 'list', description: 'List jobs' },
  {
    key: PERMISSIONS.JOBS_UPDATE_STATUS,
    resource: 'jobs',
    action: 'update_status',
    description: 'Update job status',
  },
  { key: PERMISSIONS.JOBS_DELETE, resource: 'jobs', action: 'delete', description: 'Delete a job' },
  {
    key: PERMISSIONS.JOBS_COMPLETE_UPLOAD,
    resource: 'jobs',
    action: 'complete_upload',
    description: 'Mark job upload as complete',
  },
  {
    key: PERMISSIONS.JOBS_RETRY_UPLOAD,
    resource: 'jobs',
    action: 'retry_upload',
    description: 'Retry a failed job upload',
  },
  {
    key: PERMISSIONS.JOBS_REORDER,
    resource: 'jobs',
    action: 'reorder',
    description: 'Reorder jobs in the queue',
  },
  {
    key: PERMISSIONS.FILES_READ_METADATA,
    resource: 'files',
    action: 'read_metadata',
    description: 'Read file metadata',
  },
  {
    key: PERMISSIONS.FILES_DOWNLOAD,
    resource: 'files',
    action: 'download',
    description: 'Download a file',
  },
  { key: PERMISSIONS.FILES_LIST, resource: 'files', action: 'list', description: 'List files' },
  {
    key: PERMISSIONS.FILES_DELETE,
    resource: 'files',
    action: 'delete',
    description: 'Delete a file',
    isDangerous: true,
  },
  {
    key: PERMISSIONS.INVITATIONS_CREATE,
    resource: 'invitations',
    action: 'create',
    description: 'Create an invitation',
  },
  {
    key: PERMISSIONS.INVITATIONS_READ,
    resource: 'invitations',
    action: 'read',
    description: 'Read invitation details',
  },
  {
    key: PERMISSIONS.INVITATIONS_LIST,
    resource: 'invitations',
    action: 'list',
    description: 'List invitations',
  },
  {
    key: PERMISSIONS.INVITATIONS_REVOKE,
    resource: 'invitations',
    action: 'revoke',
    description: 'Revoke an invitation',
  },
  {
    key: PERMISSIONS.SESSIONS_LIST,
    resource: 'sessions',
    action: 'list',
    description: 'List active sessions',
  },
  {
    key: PERMISSIONS.SESSIONS_REVOKE,
    resource: 'sessions',
    action: 'revoke',
    description: 'Revoke an active session',
    isDangerous: true,
  },
  {
    key: PERMISSIONS.IAM_READ,
    resource: 'iam',
    action: 'read',
    description: 'Read IAM configuration',
  },
  {
    key: PERMISSIONS.IAM_ASSIGN_PERMISSIONS,
    resource: 'iam',
    action: 'assign_permissions',
    description: 'Assign or revoke permissions on roles',
    isDangerous: true,
  },
  {
    key: PERMISSIONS.IAM_ASSIGN_ROLES,
    resource: 'iam',
    action: 'assign_roles',
    description: 'Assign or revoke roles on users or groups',
    isDangerous: true,
  },
  {
    key: PERMISSIONS.IAM_MANAGE_GROUPS,
    resource: 'iam',
    action: 'manage_groups',
    description: 'Create, update, or delete groups',
    isDangerous: true,
  },
  {
    key: PERMISSIONS.AUDIT_READ,
    resource: 'audit',
    action: 'read',
    description: 'Read the audit log',
  },

  {
    key: PERMISSIONS.BOOKINGS_LIST,
    resource: 'bookings',
    action: 'read',
    description: 'read all the bookings',
  },

  {
    key: PERMISSIONS.BOOKINGS_UPDATE_STATUS,
    resource: 'bookings',
    action: 'update_status',
    description: 'Update a Booking Status (Cancel)',
  },

  {
    key: PERMISSIONS.BOOKINGS_READ,
    resource: 'bookings',
    action: 'read',
    description: 'Read equipment availability and individual booking info',
  },
];

export const PERMISSION_KEYS = PERMISSION_CATALOG.map((permission) => permission.key);

// Role keys that are system contracts — permissions are view-only, no UI editing
export const LOCKED_ROLE_KEYS = ['super_admin', 'member'] as const;

// Group keys hidden from the groups table — surfaced separately in the UI
export const HIDDEN_GROUP_KEYS = ['members'] as const;

// Permissions that grant access to the admin section (at least one required)
export const ADMIN_SECTION_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.USERS_LIST,
  PERMISSIONS.JOBS_LIST,
  PERMISSIONS.INVITATIONS_LIST,
  PERMISSIONS.IAM_READ,
  PERMISSIONS.AUDIT_READ,
  PERMISSIONS.BOOKINGS_LIST,
  PERMISSIONS.BOOKINGS_UPDATE_STATUS,
  PERMISSIONS.BOOKINGS_READ,
];
