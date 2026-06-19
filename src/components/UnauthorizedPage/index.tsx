import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Routes } from '@/lib/routes';

interface UnauthorizedPageProps {
  title: string;
}

export default function UnauthorizedPage({ title }: UnauthorizedPageProps) {
  return (
    <div className="container space-y-6 p-6">
      <div className="space-y-4 rounded-lg border p-8 text-center">
        <ShieldX className="mx-auto h-12 w-12 text-destructive" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to access <span className="font-medium">{title}</span>.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={Routes.dashboard}>Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
