'use client';

import './globals.css';
import { Button } from '@/components/ui/button';
import { Routes } from '@/lib/routes';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Last-resort error page, for errors thrown by the root layout or by a layout with no error.tsx
 * above it (such as the protected layout's session check). It replaces the root layout, so it
 * renders its own <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
          <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="max-w-md text-center text-muted-foreground">
            We couldn&apos;t load this page. Try again, or log out if it keeps happening.
          </p>
          <div className="flex gap-2">
            <Button onClick={reset}>Try Again</Button>
            {/* A plain link: the route handler has to run on the server to delete the cookies */}
            <Button variant="outline" asChild>
              <a href={Routes.sessionReset}>Log Out</a>
            </Button>
          </div>
          {/* The digest finds the full server-side error in the hosting logs */}
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground">Error {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
