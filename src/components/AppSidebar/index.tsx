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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { SettingsPopover } from '@/components/SettingsPopover';
import { User, hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import {
  Bell,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Printer,
  Users,
  Settings,
  PenSquare,
  ScanSearch,
  DoorOpen,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { BrandLockup } from '@/components/BrandLogo';
import { usePathname } from 'next/navigation';
import { Routes } from '@/lib/routes';
import { AccessAdminRoutes } from '@/lib/access-admin-routes';
import { isJobCreationEnabled } from '@/lib/feature-flags';
import { useAlertSummary } from '@/hooks/useAlertSummary';
import { badgeText } from '@/lib/staff-alerts';

// NOTE: Equipment Booking, IAM Management, Audit Log, and the booking-admin pages (Equipment
// Bookings / Booking Requests / Equipment Management) are intentionally left out of this list
// for the initial launch — see docs/LAUNCH_SCOPE.md for what's held back and how to bring each
// one back.
interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Left out while job creation is switched off (src/lib/feature-flags.ts). */
  requiresJobCreation?: boolean;
}

const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: Routes.dashboard,
    icon: LayoutDashboard,
  },
  // "My Jobs" also covers the old Print History and New Job pages (merged in the jobs redesign).
  // Hidden while job creation is switched off (src/lib/feature-flags.ts, docs/LAUNCH_SCOPE.md).
  {
    title: 'My Jobs',
    url: Routes.jobs.home,
    icon: Printer,
    requiresJobCreation: true,
  },
  {
    title: 'Training',
    url: Routes.training.home,
    icon: GraduationCap,
  },
];

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
  /** Shows how many staff alerts still need a person (the alerts centre, P-135). */
  alertsBadge?: boolean;
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
    title: 'Alerts',
    url: Routes.adminAlerts,
    icon: Bell,
    permission: PERMISSIONS.JOBS_UPDATE_STATUS,
    alertsBadge: true,
  },
  {
    title: 'Print Review',
    url: Routes.adminReview,
    icon: ScanSearch,
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

/** The number of alerts nobody has acknowledged yet, red while one of them is critical. Nothing at zero. */
function AlertsNavBadge() {
  const summary = useAlertSummary();
  const count = summary?.unacknowledged ?? 0;
  if (count <= 0) return null;
  return (
    <SidebarMenuBadge
      className={
        summary?.unacknowledgedCritical
          ? 'bg-status-red text-status-red-foreground peer-hover/menu-button:text-status-red-foreground peer-data-active/menu-button:text-status-red-foreground'
          : 'bg-sidebar-accent'
      }
    >
      {badgeText(count)}
      <span className="sr-only"> alerts need a person</span>
    </SidebarMenuBadge>
  );
}

interface AppSidebarProps {
  user: User;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const visibleNavItems = navigationItems.filter(
    (item) => !item.requiresJobCreation || isJobCreationEnabled(),
  );
  const visibleAdminItems = adminNavigationItems.filter(
    (item) =>
      hasPermission(user, item.permission) ||
      (item.alsoPermission !== undefined && hasPermission(user, item.alsoPermission)),
  );

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
              {visibleNavItems.map((item) => (
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
                {visibleAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
                      className={NAV_BUTTON_CLASS}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.alertsBadge && <AlertsNavBadge />}
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
