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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SettingsPopover } from '@/components/SettingsPopover';
import { User, hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import {
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Printer,
  Users,
  Settings,
  Shield,
  ChevronDown,
  PenSquare,
  DoorOpen,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { BrandLockup } from '@/components/BrandLogo';
import { usePathname } from 'next/navigation';
import { Routes } from '@/lib/routes';
import { AccessAdminRoutes } from '@/lib/access-admin-routes';

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
  {
    title: 'Training',
    url: Routes.training.home,
    icon: GraduationCap,
  },
];

// The admin pages all live under /admin, so they're nested under Admin Dashboard in the sidebar
const adminDashboardItem = {
  title: 'Admin Dashboard',
  url: '/admin',
  icon: Shield,
};

// Highlight "My Jobs" on every page under it (a job's details, the new job form), and
// "Training" while working through a training
const isNavItemActive = (pathname: string, url: string) =>
  pathname === url ||
  ((url === Routes.jobs.home || url === Routes.training.home) && pathname.startsWith(`${url}/`));

interface AdminNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  permission: string;
  /** A second permission that also shows the entry. */
  alsoPermission?: string;
}

const adminNavigationItems: AdminNavItem[] = [
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
    title: 'Training Sign-offs',
    url: Routes.adminSignoffs,
    icon: ClipboardCheck,
    permission: PERMISSIONS.TRAINING_SIGNOFF,
  },
  {
    title: 'Training Editor',
    url: '/admin/training',
    icon: PenSquare,
    // Either permission opens the editor (publishing alone gets an explanation inside).
    permission: PERMISSIONS.TRAINING_AUTHOR,
    alsoPermission: PERMISSIONS.TRAINING_PUBLISH,
  },
  {
    title: 'Access System',
    url: AccessAdminRoutes.home,
    icon: DoorOpen,
    permission: PERMISSIONS.ACCESS_ADMIN,
  },
];

// Larger text and tap area than the shadcn default, especially on phones
const NAV_BUTTON_CLASS =
  'h-11 text-base fine:h-9 fine:text-[15px] [&_svg]:size-5 fine:[&_svg]:size-4';

interface AppSidebarProps {
  user: User;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const visibleAdminItems = adminNavigationItems.filter(
    (item) =>
      hasPermission(user, item.permission) ||
      (item.alsoPermission !== undefined && hasPermission(user, item.alsoPermission)),
  );
  // The admin pages stay folded away on member pages, so the drawer shows the member links first
  const onAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <Sidebar>
      {/* Same height as the page header beside it, so their bottom borders line up */}
      <SidebarHeader className="h-16 justify-center border-b px-4 py-0">
        {/* At this height the "MAKERSPACES" letters match the page title's capitals */}
        <Link href={Routes.dashboard} className="relative block h-11 w-full">
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

        {visibleAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Keyed on the section, so entering an admin page opens it (the default is read again) */}
                <Collapsible
                  key={onAdminPage ? 'admin-page' : 'member-page'}
                  asChild
                  defaultOpen={onAdminPage}
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === adminDashboardItem.url}
                      className={NAV_BUTTON_CLASS}
                    >
                      <Link href={adminDashboardItem.url}>
                        <adminDashboardItem.icon className="h-4 w-4" />
                        <span>{adminDashboardItem.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="top-0! right-0! size-11! data-[state=open]:rotate-180 fine:top-1.5! fine:right-1! fine:size-5!">
                        <ChevronDown />
                        <span className="sr-only">Toggle admin pages</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {visibleAdminItems.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={
                                pathname === item.url || pathname.startsWith(`${item.url}/`)
                              }
                            >
                              <Link href={item.url}>
                                <item.icon />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
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
