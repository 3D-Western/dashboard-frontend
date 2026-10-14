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
import { LayoutDashboard, Printer, Users, Settings, Shield, TicketPlus } from 'lucide-react';
import Link from 'next/link';
import { BrandLockup } from '@/components/BrandLogo';
import { usePathname } from 'next/navigation';
import { Routes } from '@/lib/routes';

// NOTE: Equipment Booking, IAM Management, Audit Log, and the booking-admin pages (Equipment
// Bookings / Booking Requests / Equipment Management) are intentionally left out of this list
// for the initial launch — see docs/LAUNCH_SCOPE.md for what's held back and how to bring each
// one back.
const navigationItems = [
  {
    title: 'Dashboard',
    url: Routes.dashboard,
    icon: LayoutDashboard,
  },
  // "My Jobs" also covers the old Print History and New Job pages (merged in the jobs redesign)
  {
    title: 'My Jobs',
    url: Routes.jobs.home,
    icon: Printer,
  },
];

// Highlight "My Jobs" on every page under it (a job's details, the new job form)
const isNavItemActive = (pathname: string, url: string) =>
  pathname === url || (url === Routes.jobs.home && pathname.startsWith(`${url}/`));

const adminNavigationItems = [
  {
    title: 'Admin Dashboard',
    url: '/admin',
    icon: Shield,
    permission: null, // visible to all admins
  },
  {
    title: 'User Management',
    url: Routes.adminUsersManagement,
    icon: Users,
    permission: PERMISSIONS.USERS_LIST,
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

// Larger text and tap area than the shadcn default, especially on phones
const NAV_BUTTON_CLASS = 'h-11 text-base md:h-9 md:text-[15px] [&_svg]:size-5 md:[&_svg]:size-4';

interface AppSidebarProps {
  user: User;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <Link href={Routes.dashboard} className="relative block h-12 w-full">
          <BrandLockup priority className="object-left" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavItemActive(pathname, item.url)}
                    className={NAV_BUTTON_CLASS}
                  >
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
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        className={NAV_BUTTON_CLASS}
                      >
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
