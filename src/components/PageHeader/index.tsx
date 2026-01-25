'use client';

import { Routes } from '@/lib/routes';
import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  [Routes.dashboard]: 'Dashboard',
  [Routes.orders.home]: 'My Orders',
  [Routes.orders.newOrder]: 'Create New Order',
  [Routes.orders.newPrintOrder]: 'Create 3D Print Order',
  [Routes.orders.newCncOrder]: 'Create CNC Machining Order',
  [Routes.orders.newLaserCuttingOrder]: 'Create Laser Cutting Order',
  [Routes.orders.newWaterJetOrder]: 'Create Water Jet Cutting Order',
  [Routes.dashboardUserSettings]: 'Settings',
  ['/admin']: 'Admin Dashboard',
  [Routes.adminUsersManagement]: 'User Management',
  [Routes.adminOrdersManagement]: 'Order Management',
  [Routes.adminInvitationManagement]: 'Invitation Management',
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
