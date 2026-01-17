import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PrintOrderForm from './components/PrintOrderForm';

export const metadata: Metadata = {
  title: 'New 3D Print Order',
  description: 'Create a new 3D printing order',
};

export default function NewPrintOrderPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/orders/new" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Order Selection
          </Link>
        </Button>
        <h1 className="mb-2 text-3xl font-bold">Create 3D Print Order</h1>
        <p className="text-muted-foreground">
          Upload your 3D model and specify your printing requirements
        </p>
      </div>
      
      <PrintOrderForm />
    </div>
  );
}
