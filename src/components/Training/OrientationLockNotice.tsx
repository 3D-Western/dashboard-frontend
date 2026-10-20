'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Routes } from '@/lib/routes';

export const ORIENTATION_LOCK_TITLE = 'Finish Maker Orientation to submit prints';

/**
 * Shown in place of (or above) the print form while Maker Orientation is required and not done.
 * Orientation is short and fully online, so the message says that and leads straight to it.
 *
 * With `interrupt` the notice announces itself (role="alert"), scrolls into view and takes focus
 * when it appears, for when it shows up after a submit and might otherwise be missed on a phone.
 */
export function OrientationLockNotice({
  className,
  interrupt = false,
}: {
  className?: string;
  interrupt?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!interrupt) return;
    // scrollIntoView is missing in some environments (jsdom), so it is optional
    ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    ref.current?.focus({ preventScroll: true });
  }, [interrupt]);

  return (
    <section
      ref={ref}
      role={interrupt ? 'alert' : undefined}
      tabIndex={interrupt ? -1 : undefined}
      aria-labelledby="orientation-lock-heading"
      className={`flex flex-col gap-4 rounded-xl border border-purple-light/50 bg-purple-light/10 p-5 outline-none sm:flex-row sm:items-center sm:p-6 ${className ?? ''}`}
    >
      <Lock className="size-8 shrink-0 text-purple-light" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        <h2 id="orientation-lock-heading" className="text-lg">
          {ORIENTATION_LOCK_TITLE}
        </h2>
        <p className="text-sm text-muted-foreground">
          Maker Orientation is a short video, some reading and a quiz on safety and how the space
          works. It is all online, and you can stop and pick up where you left off.
        </p>
      </div>
      <Button asChild className="w-full sm:w-auto">
        <Link href={Routes.training.home}>Go to Maker Orientation</Link>
      </Button>
    </section>
  );
}
