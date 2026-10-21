'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { Routes } from '@/lib/routes';
import { TrainingAdminRoutes } from '@/lib/training-admin-routes';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const pageTitles: Record<string, string> = {
  [Routes.dashboard]: 'Dashboard',
  [Routes.jobs.home]: 'My Jobs',
  [Routes.training.home]: 'Training',
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
  [Routes.adminSignoffs]: 'Training Sign-offs',
  [TrainingAdminRoutes.home]: 'Training Editor',
  [TrainingAdminRoutes.equipment]: 'Training Equipment',
  [TrainingAdminRoutes.import]: 'Import a Training',
  [TrainingAdminRoutes.auditLog]: 'Training Audit Log',
};

// The titled pages above this one in the URL, e.g. /admin/users → [Admin Dashboard]
function getParentPages(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments
    .slice(0, -1)
    .map((_, i) => `/${segments.slice(0, i + 1).join('/')}`)
    .filter((url) => url in pageTitles)
    .map((url) => ({ url, title: pageTitles[url] }));
}

export function PageHeader() {
  const pathname = usePathname();
  const isJobDetail = pathname.startsWith(`${Routes.jobs.home}/`) && !pageTitles[pathname];
  const isTrainingSession =
    pathname.startsWith(`${Routes.training.home}/`) && !pageTitles[pathname];
  // A training being edited, e.g. /admin/training/12/draft
  const isTrainingEdit =
    pathname.startsWith(`${TrainingAdminRoutes.home}/`) && !pageTitles[pathname];
  // One sign-off, e.g. /admin/signoffs/12
  const isSignoffDetail = pathname.startsWith(`${Routes.adminSignoffs}/`) && !pageTitles[pathname];
  const title =
    pageTitles[pathname] ||
    (isJobDetail
      ? 'Job Details'
      : isTrainingSession
        ? 'Training Session'
        : isTrainingEdit
          ? 'Edit Training'
          : isSignoffDetail
            ? 'Training Sign-off'
            : 'Dashboard');
  // A job's details page (or a training session) has no fixed title, but still sits under its list
  const parents =
    pageTitles[pathname] || isJobDetail || isTrainingSession || isTrainingEdit || isSignoffDetail
      ? getParentPages(pathname)
      : [];

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {/* Parent links are hidden on phones to leave room for the title */}
        {parents.map((page) => (
          <Fragment key={page.url}>
            <BreadcrumbItem className="hidden md:inline-flex">
              <BreadcrumbLink asChild>
                <Link href={page.url}>{page.title}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
          </Fragment>
        ))}
        <BreadcrumbItem className="min-w-0">
          <h1 aria-current="page" className="truncate text-lg font-semibold text-foreground">
            {title}
          </h1>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
