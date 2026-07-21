export const Routes = {
  dashboard: '/dashboard',
  login: '/login',
  signup: '/signup',
  mfa: '/mfa',
  dashboardUserSettings: '/dashboard/settings',
  dashboardSubmissionHistory: '/dashboard/jobs/print-submission-history',
  bookings: '/dashboard/bookings',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  checkEmail: '/check-email',
  verifyEmail: '/verify-email',

  // Admin routes
  adminUsersManagement: '/admin/users',
  adminJobsManagement: '/admin/jobs',
  adminInvitationManagement: '/admin/invitations',
  adminIamManagement: '/admin/iam',
  adminAuditLog: '/admin/audit',

  jobs: {
    home: '/dashboard/jobs',
    newJob: '/dashboard/jobs/new',
    newCncJob: '/dashboard/jobs/cnc/new',
    newPrintJob: '/dashboard/jobs/print/new',
    newWaterJetJob: '/dashboard/jobs/water-jet/new',
    newLaserCuttingJob: '/dashboard/jobs/laser-cutting/new',
  },
};
