export const Routes = {
  dashboard: '/dashboard',
  login: '/login',
  signup: '/signup',
  mfa: '/mfa',
  dashboardUserSettings: '/dashboard/settings',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  checkEmail: '/check-email',
  verifyEmail: '/verify-email',

  // Admin routes
  adminUsersManagement: '/admin/users',
  adminOrdersManagement: '/admin/orders',
  adminInvitationManagement: '/admin/invitations',

  orders: {
    home: '/dashboard/orders',
    newOrder: '/dashboard/orders/new',
    newCncOrder: '/dashboard/orders/cnc/new',
    newPrintOrder: '/dashboard/orders/print/new',
    newWaterJetOrder: '/dashboard/orders/water-jet/new',
    newLaserCuttingOrder: '/dashboard/orders/laser-cutting/new',
  },
};
