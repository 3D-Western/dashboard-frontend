import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Printer, Lock, ClipboardList, TicketPlus } from 'lucide-react';
import Link from 'next/link';
import PageTitle from '@/components/PageTitle';
import { Routes } from '@/lib/routes';
import { validateSession } from '@/lib/auth';
import { hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Administrative dashboard for 3D Western',
};

export default async function AdminDashboardPage() {
  const user = await validateSession();

  return (
    <div className="container space-y-6 p-6">
      <PageTitle title="Admin Dashboard" description="Administrative dashboard for 3D Western" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {user && hasPermission(user, PERMISSIONS.USERS_LIST) && (
          <Link href={Routes.adminUsersManagement}>
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>User Management</CardTitle>
                </div>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View and manage all user accounts, roles, and access levels.
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {user && hasPermission(user, PERMISSIONS.JOBS_LIST) && (
          <Link href={Routes.adminJobsManagement}>
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Job Management</CardTitle>
                </div>
                <CardDescription>Manage all jobs and settings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Monitor, modify, and manage all jobs across the system.
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {user && hasPermission(user, PERMISSIONS.INVITATIONS_LIST) && (
          <Link href={Routes.adminInvitationManagement}>
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TicketPlus className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Invitation Management</CardTitle>
                </div>
                <CardDescription>Manage user invitations</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create, view, and revoke invitations for new users.
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {user && hasPermission(user, PERMISSIONS.IAM_READ) && (
          <Link href={Routes.adminIamManagement}>
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>IAM Management</CardTitle>
                </div>
                <CardDescription>Manage roles, groups, and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Configure identity and access management, assign roles and permissions.
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {user && hasPermission(user, PERMISSIONS.AUDIT_READ) && (
          <Link href={Routes.adminAuditLog}>
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Audit Log</CardTitle>
                </div>
                <CardDescription>View system activity and audit history</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Review all system actions, user activity, and administrative changes.
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
