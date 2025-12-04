'use client';

import { Routes } from '@/lib/routes';
import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
<<<<<<< HEAD
  [Routes.dashboard]: 'Dashboard',
  [Routes.prints]: 'Prints',
  [Routes.dashboardUserSettings]: 'Settings',
  [Routes.adminUsersManagement]: 'User Management',
  [Routes.adminPrintsManagement]: 'Print Management',
=======
  '/dashboard': 'Dashboard',
  '/print': 'Prints',
  '/dashboard/settings': 'Settings',
  '/admin/users': 'User Management',
  '/admin/prints': 'Print Management',
  '/dashboard/print/new': 'New Print Request',
>>>>>>> fb26115 (feat: page to create new print request  (#46))
};

export function PageHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Dashboard';

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-lg font-semibold">{title}</h1>
    </div>
  );
}
