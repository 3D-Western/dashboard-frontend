import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Printer } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  return (
    <div className="container space-y-6 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

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

        <Link href="/admin/prints">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Print Management</CardTitle>
              </div>
              <CardDescription>Manage all print jobs and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Monitor, modify, and manage all print jobs across the system.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
