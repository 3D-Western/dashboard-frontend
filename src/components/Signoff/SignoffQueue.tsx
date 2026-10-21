'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { signoffAPI } from '@/api/client/signoff';
import { signoffErrorMessage } from '@/api/client/signoff-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAgo, personName } from '@/lib/signoff-format';
import { Routes } from '@/lib/routes';
import type { Signoff } from '@/types/signoff';

/**
 * Students who passed a machine training online and wait for an in-person check, oldest first.
 * Built for a phone: one tall card per student, and the whole card is the tap target.
 */
export function SignoffQueue({ now = new Date() }: { now?: Date }) {
  const [items, setItems] = useState<Signoff[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      setItems(await signoffAPI.list());
    } catch (err) {
      setError(signoffErrorMessage(err, "We couldn't load the sign-off list."));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    run();
  }, [load]);

  if (!items && !error) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading sign-offs">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {items && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {items.length === 0
              ? 'Nobody is waiting.'
              : `${items.length} ${items.length === 1 ? 'student is' : 'students are'} waiting`}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11 fine:h-9"
            onClick={() => void load()}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      )}

      {!items && error && (
        <Button type="button" variant="outline" onClick={() => void load()}>
          Try again
        </Button>
      )}

      {items && items.length === 0 && (
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          No one is waiting for a sign-off. When a student passes the online part of a machine
          training, they show up here.
        </p>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((signoff) => (
            <li key={signoff.id}>
              <Link
                href={Routes.adminSignoff(signoff.id)}
                className="flex min-h-20 items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-base font-medium">{personName(signoff.student)}</p>
                  <p className="text-sm text-muted-foreground">
                    Student number {signoff.student.studentId}
                  </p>
                  <p className="text-sm">
                    {signoff.training.title}
                    <span className="text-muted-foreground">
                      {' '}
                      · passed online {formatAgo(signoff.onlinePassedAt, now)}
                    </span>
                  </p>
                  {signoff.ownRequest && (
                    <p className="text-sm text-muted-foreground">
                      This is you. Another supervisor has to sign you off.
                    </p>
                  )}
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
