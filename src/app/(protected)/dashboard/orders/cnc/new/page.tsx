import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CNCOrderForm from './components/CNCOrderForm';

export const metadata: Metadata = {
  title: 'New CNC Order',
  description: 'Create a new CNC machining order',
};

export default function NewCNCOrderPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/orders/new" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Order Selection
          </Link>
        </Button>
        <h1 className="mb-2 text-3xl font-bold">Create CNC Machining Order</h1>
        <p className="text-muted-foreground">
          Upload your design files and specify machining requirements
        </p>
      </div>

      <CNCOrderForm />
    </div>
  );
}
