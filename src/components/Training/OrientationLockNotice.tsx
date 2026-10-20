import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Routes } from '@/lib/routes';

export const ORIENTATION_LOCK_TITLE = 'Finish Maker Orientation to submit prints';

/**
 * Shown in place of (or above) the print form while Maker Orientation is required and not done.
 * Orientation is short and fully online, so the message says that and leads straight to it.
 */
export function OrientationLockNotice({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="orientation-lock-heading"
      className={`flex flex-col gap-4 rounded-xl border border-purple-light/50 bg-purple-light/10 p-5 sm:flex-row sm:items-center sm:p-6 ${className ?? ''}`}
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
