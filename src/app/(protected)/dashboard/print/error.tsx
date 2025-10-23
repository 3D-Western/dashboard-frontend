'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function PrintJobsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Print jobs error:', error);
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
          Failed to Load Print Jobs
        </h2>
        <p id="error-description" className="text-muted-foreground text-center max-w-md">
          We couldn&apos;t load your print jobs. This might be due to a network issue or server
          problem.
        </p>
        {error.message && (
          <p className="text-sm text-muted-foreground font-mono bg-muted px-3 py-1 rounded">
            {error.message}
          </p>
        )}
        <div className="flex gap-2">
          <Button onClick={reset} variant="default">
            Try Again
          </Button>
          <Button onClick={() => (window.location.href = '/dashboard')} variant="outline">
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
