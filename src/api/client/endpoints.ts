export const endpoints = {
  auth: {
    login: '/api/v1/auth/login',
    logout: '/api/v1/auth/logout',
    refresh: '/api/v1/auth/refresh',
    signup: '/api/v1/auth/signup',
  },
  resetPassword: {
    forgotPassword: '/api/v1/auth/forgot-password',
    resetPassword: '/api/v1/auth/reset-password',
  },
  users: {
    me: '/api/v1/users/me',
    list: '/api/v1/users',
    byId: (userId: number) => `/api/v1/users/${userId}`,
    jobs: '/api/v1/users/me/jobs',
    changePassword: '/api/v1/users/me/password',
  },
  jobs: {
    list: '/api/v1/jobs',
    byId: (jobId: string) => `/api/v1/jobs/${jobId}`,
    create: '/api/v1/jobs',
    completeUpload: (jobId: string) => `/api/v1/jobs/${jobId}/complete-upload`,
    retryUpload: (jobId: string) => `/api/v1/jobs/${jobId}/retry-upload`,
  },
  files: {
    list: '/api/v1/files',
    byId: (fileId: string) => `/api/v1/files/${fileId}`,
    delete: (fileId: string) => `/api/v1/files/${fileId}`,
    download: (fileId: string) => `/api/v1/files/${fileId}/download`,
  },
  mfa: {
    verifyOtp: '/api/v1/mfa/email/verify',
    resendOtp: (challengeId: number) => `/api/v1/mfa/email/challenge/${challengeId}/resend`,
  },
  emailVerify: {
    verifyEmail: '/api/v1/auth/verify-email',
    resendEmail: `/api/v1/auth/resend-verification`,
  },
  invitations: {
    list: '/api/v1/admin/invitations',
    create: '/api/v1/admin/invitations',
    byId: (invitationId: number) => `/api/v1/admin/invitations/${invitationId}`,
    revoke: (invitationId: number) => `/api/v1/admin/invitations/${invitationId}/revoke`,
  },
  iam: {
    permissions: '/api/v1/admin/iam/permissions',
    scopes: '/api/v1/admin/iam/scopes',
    roles: {
      list: '/api/v1/admin/iam/roles',
      byId: (id: number) => `/api/v1/admin/iam/roles/${id}`,
      create: '/api/v1/admin/iam/roles',
      update: (id: number) => `/api/v1/admin/iam/roles/${id}`,
      deactivate: (id: number) => `/api/v1/admin/iam/roles/${id}`,
      permissions: (id: number) => `/api/v1/admin/iam/roles/${id}/permissions`,
    },
    groups: {
      list: '/api/v1/admin/iam/groups',
      byId: (id: number) => `/api/v1/admin/iam/groups/${id}`,
      create: '/api/v1/admin/iam/groups',
      update: (id: number) => `/api/v1/admin/iam/groups/${id}`,
      deactivate: (id: number) => `/api/v1/admin/iam/groups/${id}`,
      roles: (id: number) => `/api/v1/admin/iam/groups/${id}/roles`,
      revokeRole: (id: number, roleId: number) => `/api/v1/admin/iam/groups/${id}/roles/${roleId}`,
      users: (id: number) => `/api/v1/admin/iam/groups/${id}/users`,
    },
    users: {
      groups: (userId: number) => `/api/v1/admin/iam/users/${userId}/groups`,
      revokeGroup: (userId: number, groupId: number) =>
        `/api/v1/admin/iam/users/${userId}/groups/${groupId}`,
      roles: (userId: number) => `/api/v1/admin/iam/users/${userId}/roles`,
      revokeRole: (userId: number, roleId: number) =>
        `/api/v1/admin/iam/users/${userId}/roles/${roleId}`,
    },
    auditLogs: '/api/v1/admin/iam/audit-logs',
  },
  bookings: {
    list: '/api/v1/bookings',
    create: '/api/v1/bookings',
    byId: (id: string) => `/api/v1/bookings/${id}`, // for details and can be used for delete as well.
    update: (id: string) => `/api/v1/bookings/${id}`,
    availability: (equipmentId: string) => `/api/v1/equipment/${equipmentId}/availability`, // for checking availability
    adminCapacity: (equipmentId: string) => `/api/v1/admin/equipment/${equipmentId}/capacity`,
    adminOverride: (id: string) => `/api/v1/admin/bookings/${id}/override`,
    adminRestrictions: (equipmentId: string) =>
      `/api/v1/admin/equipment/${equipmentId}/restrictions`,
  },
};
