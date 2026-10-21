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
  adminIamManagement: '/admin/iam',
  adminBookingsManagement: '/admin/bookings',
  adminBookingRequests: '/admin/requests',
  adminEquipmentManagement: '/admin/equipment',
  adminSignoffs: '/admin/signoffs',
  adminSignoff: (signoffId: number) => `/admin/signoffs/${signoffId}`,

  training: {
    home: '/dashboard/training',
    attempt: (attemptId: number) => `/dashboard/training/attempt/${attemptId}`,
    /** Read-only review of a failed attempt's material; `stepId` opens on that section. */
    review: (attemptId: number, stepId?: number) =>
      `/dashboard/training/attempt/${attemptId}/review${stepId ? `?step=${stepId}` : ''}`,
  },

  jobs: {
    home: '/dashboard/jobs',
    detail: (jobId: string) => `/dashboard/jobs/${jobId}`,
    /** My Jobs right after a print is submitted: it offers the home-screen install card. */
    printSubmitted: '/dashboard/jobs?submitted=1',
    newJob: '/dashboard/jobs/new',
    newCncJob: '/dashboard/jobs/cnc/new',
    newPrintJob: '/dashboard/jobs/print/new',
    newWaterJetJob: '/dashboard/jobs/water-jet/new',
    newLaserCuttingJob: '/dashboard/jobs/laser-cutting/new',
  },
};
