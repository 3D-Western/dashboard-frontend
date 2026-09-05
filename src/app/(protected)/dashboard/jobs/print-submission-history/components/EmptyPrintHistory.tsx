import Link from 'next/link';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Routes } from '@/lib/routes';

export function EmptyPrintHistory() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Printer className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">You haven&apos;t printed anything yet</h2>
        <p className="text-sm text-muted-foreground">
          Submit your first fabrication job to see it here.
        </p>
      </div>
      <Button asChild className="mt-2">
        <Link href={Routes.jobs.newJob}>Start Printing</Link>
      </Button>
    </div>
  );
}
