'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="container p-6">
      <div
        className="flex flex-col items-center justify-center min-h-[400px] space-y-4"
        role="alert"
        aria-live="assertive"
        aria-labelledby="error-heading"
        aria-describedby="error-description"
      >
        <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
        <h2 id="error-heading" className="text-2xl font-bold">
          Something went wrong!
        </h2>
        <p id="error-description" className="text-muted-foreground text-center max-w-md">
          We encountered an error while loading your dashboard. Please try again.
        </p>
        {error.message && <p className="text-sm text-muted-foreground">Error: {error.message}</p>}
        <Button onClick={reset} variant="default">
          Try Again
        </Button>
      </div>
    </div>
  );
}
