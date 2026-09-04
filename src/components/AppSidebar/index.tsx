'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { SettingsPopover } from '@/components/SettingsPopover';
import { User, hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import {
  LayoutDashboard,
  Printer,
  Settings,
  Shield,
  FilePlus,
  TicketPlus,
  History,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Routes } from '@/lib/routes';

// NOTE: Equipment Booking, User Management, IAM Management, Audit Log, and the booking-admin
// pages (Equipment Bookings / Booking Requests / Equipment Management) are intentionally left
// out of this list for the initial launch — see docs/LAUNCH_SCOPE.md for what's held back and
// how to bring each one back.
const navigationItems = [
  {
    title: 'Dashboard',
    url: Routes.dashboard,
    icon: LayoutDashboard,
  },
  {
    title: 'Print History',
    url: Routes.dashboardSubmissionHistory,
    icon: History,
  },
  {
    title: 'My Jobs',
    url: Routes.jobs.home,
    icon: Printer,
  },
  {
    title: 'New Job',
    url: Routes.jobs.newJob,
    icon: FilePlus,
  },
];

const adminNavigationItems = [
  {
    title: 'Admin Dashboard',
    url: '/admin',
    icon: Shield,
    permission: null, // visible to all admins
  },
  {
    title: 'Job Management',
    url: Routes.adminJobsManagement,
    icon: Settings,
    // JOBS_LIST is also granted to regular members (own-scoped, for "My Jobs"), so it can't
    // distinguish admins here. JOBS_UPDATE_STATUS is the permission the actual admin job-status
    // override endpoint requires (PATCH /jobs/:jobId) and is never granted to members.
    permission: PERMISSIONS.JOBS_UPDATE_STATUS,
  },
  {
    title: 'Invitation Management',
    url: Routes.adminInvitationManagement,
    icon: TicketPlus,
    permission: PERMISSIONS.INVITATIONS_LIST,
  },
];

interface AppSidebarProps {
  user: User;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          {/* Placeholder for company icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-lg font-bold text-primary">W3D</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Western 3D Print Club</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminNavigationItems.some(
          (item) => item.permission !== null && hasPermission(user, item.permission),
        ) && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavigationItems
                  .filter(
                    (item) => item.permission === null || hasPermission(user, item.permission),
                  )
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback aria-label={`${user.firstName} ${user.lastName}`}>
                {user.lastName[0] + user.firstName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs text-muted-foreground">ID: {user.studentId}</span>
            </div>
          </div>
          <SettingsPopover />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
