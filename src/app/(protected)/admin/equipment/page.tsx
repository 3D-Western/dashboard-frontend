import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { validateSession } from '@/lib/auth';
import { hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { Routes } from '@/lib/routes';
import { EQUIPMENT_CATEGORY_OPTIONS } from '@/constants/equipment';

export const metadata: Metadata = {
  title: 'Equipment Management',
  description: 'Manage capacity and booking restrictions per piece of equipment',
};

export default async function AdminEquipmentPage() {
  const user = await validateSession();
  if (!user || !hasPermission(user, PERMISSIONS.BOOKINGS_READ))
    return <UnauthorizedPage title="Equipment Management" />;

  return (
    <div className="container space-y-6 p-6">
      <PageTitle
        title="Equipment Management"
        description="Manage capacity and booking restrictions per piece of equipment"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {EQUIPMENT_CATEGORY_OPTIONS.map((equipment) => (
          <Link
            key={equipment.id}
            href={`${Routes.adminEquipmentManagement}/${equipment.id}/capacity`}
          >
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>{equipment.label}</CardTitle>
                </div>
                <CardDescription>{equipment.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View live utilization and configure capacity, approval, and safety restrictions.
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
