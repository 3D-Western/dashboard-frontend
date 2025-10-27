'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/print': 'Prints',
  '/dashboard/settings': 'Settings',
  '/admin/users': 'User Management',
  '/admin/prints': 'Print Management',
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
