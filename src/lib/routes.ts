export const Routes = {
  dashboard: '/dashboard',
  login: '/login',
  signup: '/signup',
  mfa: '/mfa',
  dashboardUserSettings: '/dashboard/settings',
  bookings: '/dashboard/bookings',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  checkEmail: '/check-email',
  verifyEmail: '/verify-email',
  onboarding: '/onboarding',

  // Admin routes
  adminUsersManagement: '/admin/users',
  adminJobsManagement: '/admin/jobs',
  adminInvitationManagement: '/admin/invitations',
  adminIamManagement: '/admin/iam',
  adminAuditLog: '/admin/audit',
  adminBookingsManagement: '/admin/bookings',
  adminBookingRequests: '/admin/requests',
  adminEquipmentManagement: '/admin/equipment',
  adminSignoffs: '/admin/signoffs',
  adminSignoff: (signoffId: number) => `/admin/signoffs/${signoffId}`,

  training: {
    home: '/dashboard/training',
    attempt: (attemptId: number) => `/dashboard/training/attempt/${attemptId}`,
  },

  jobs: {
    home: '/dashboard/jobs',
    detail: (jobId: string) => `/dashboard/jobs/${jobId}`,
    newJob: '/dashboard/jobs/new',
    newCncJob: '/dashboard/jobs/cnc/new',
    newPrintJob: '/dashboard/jobs/print/new',
    newWaterJetJob: '/dashboard/jobs/water-jet/new',
    newLaserCuttingJob: '/dashboard/jobs/laser-cutting/new',
  },
};
