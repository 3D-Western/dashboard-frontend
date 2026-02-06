'use client';

import { Routes } from '@/lib/routes';
import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  [Routes.dashboard]: 'Dashboard',
  [Routes.jobs.home]: 'My Jobs',
  [Routes.jobs.newJob]: 'Create New Job',
  [Routes.jobs.newPrintJob]: 'Create 3D Print Job',
  [Routes.jobs.newCncJob]: 'Create CNC Machining Job',
  [Routes.jobs.newLaserCuttingJob]: 'Create Laser Cutting Job',
  [Routes.jobs.newWaterJetJob]: 'Create Water Jet Cutting Job',
  [Routes.dashboardUserSettings]: 'Settings',
  ['/admin']: 'Admin Dashboard',
  [Routes.adminUsersManagement]: 'User Management',
  [Routes.adminJobsManagement]: 'Job Management',
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
