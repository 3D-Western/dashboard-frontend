/** Pages of the admin access system (`/admin/access`). Kept apart from `Routes` on purpose. */
export const AccessAdminRoutes = {
  home: '/admin/access',
  gatekeepers: '/admin/access/gatekeepers',
  devices: '/admin/access/devices',
  cardLinks: '/admin/access/card-links',
} as const;
