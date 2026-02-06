export const endpoints = {
  auth: {
    login: '/api/v1/auth/login',
    logout: '/api/v1/auth/logout',
    refresh: '/api/v1/auth/refresh',
    signup: '/api/v1/auth/signup',
  },
  session: {
    current: '/api/v1/session/current',
  },
  resetPassword: {
    forgotPassword: '/api/v1/auth/forgot-password',
    resetPassword: '/api/v1/auth/reset-password',
  },
  users: {
    me: '/api/v1/users/me',
    list: '/api/v1/users',
    byId: (userId: number) => `/api/v1/users/${userId}`,
    orders: '/api/v1/users/me/print-jobs',
    changePassword: '/api/v1/users/me/password',
  },
  orders: {
    list: '/api/v1/orders',
    byId: (orderId: string) => `/api/v1/orders/${orderId}`,
    create: '/api/v1/orders',
    cancel: (orderId: string) => `/api/v1/orders/active/cancel/${orderId}`,
    completeUpload: (orderId: string) => `/api/v1/orders/${orderId}/complete-upload`,
    retryUpload: (orderId: string) => `/api/v1/orders/${orderId}/retry-upload`,
  },
  files: {
    upload: '/api/v1/files/upload',
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
};
