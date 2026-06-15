'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Protected layout error:', error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <h2 className="text-2xl font-bold">Unable to connect</h2>
      <p className="max-w-md text-center text-muted-foreground">
        We couldn&apos;t reach the server. Please check your connection and try again.
      </p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
