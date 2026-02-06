import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Printer } from 'lucide-react';
import Link from 'next/link';
import PageTitle from '@/components/PageTitle';
import { Routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Administrative dashboard for 3D Western',
};

export default async function AdminDashboardPage() {
  return (
    <div className="container space-y-6 p-6">
      <PageTitle title="Admin Dashboard" description="Administrative dashboard for 3D Western" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/users">
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
      </div>
    </div>
  );
}
